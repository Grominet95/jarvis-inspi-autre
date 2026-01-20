#!/usr/bin/env python3
"""
ML server for converting generated images to STL using Hunyuan3D-DiT (mini-turbo)

Endpoints:
  GET  /            - Overview and instructions
  POST /image2stl    - Accepts JSON { image: <base64 or URL> } and returns STL binary
"""
import os
import base64
from io import BytesIO
from flask import Flask, request, send_file, jsonify
import time
from PIL import Image
import torch
import time

# Monkey-patch for newer huggingface_hub compatibility
import huggingface_hub
from huggingface_hub import hf_hub_download
if not hasattr(huggingface_hub, 'cached_download'):
    huggingface_hub.cached_download = hf_hub_download

# Import the 3D shape pipeline
from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline

# Initialize shape model
device = 'cuda' if torch.cuda.is_available() else 'cpu'
shape_pipe = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(
    'tencent/Hunyuan3D-2mini',
    subfolder='hunyuan3d-dit-v2-mini-turbo',
    use_safetensors=False,
    device=device
)
shape_pipe.enable_flashvdm(topk_mode='merge')

app = Flask(__name__)
# Enable CORS for cross-origin requests
@app.after_request
def add_cors(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
    return response

@app.route('/', methods=['GET'])
def index():
    return __doc__, 200, {'Content-Type': 'text/plain'}

@app.route('/image2stl', methods=['POST'])
def image2stl():
    try:
        data = request.get_json(force=True)
        img_input = data.get('image', '')
        if not img_input:
            return jsonify({'error': 'No image provided'}), 400

        # Load image from URL, data URL, or raw base64
        if img_input.startswith('http://') or img_input.startswith('https://'):
            import requests
            resp = requests.get(img_input)
            resp.raise_for_status()
            img = Image.open(BytesIO(resp.content)).convert('RGBA')
        elif img_input.startswith('data:'):
            header, b64 = img_input.split(',', 1)
            img = Image.open(BytesIO(base64.b64decode(b64))).convert('RGBA')
        else:
            img = Image.open(BytesIO(base64.b64decode(img_input))).convert('RGBA')

        # Generate mesh
        mesh = shape_pipe(
            image=img,
            num_inference_steps=5,
            octree_resolution=380,
            num_chunks=20000,
            generator=torch.manual_seed(int(time.time()) & 0xFFFFFFFF),
            output_type='trimesh'
        )[0]

        # Export to STL in-memory
        buf = BytesIO()
        mesh.export(buf, file_type='stl')
        buf.seek(0)

        return send_file(
            buf,
            mimetype='application/vnd.ms-pki.stl',
            as_attachment=True,
            download_name='model.stl'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    import time
    app.run(host='0.0.0.0', port=8000, debug=True)