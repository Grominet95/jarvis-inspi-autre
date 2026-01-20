import React, { useState } from 'react';

const FunctionDemoApp = ({ onClose }) => {  const [demoText, setDemoText] = useState('');
  const [result, setResult] = useState(null);
  const [isJsonValid, setIsJsonValid] = useState(false);
  const [functionDetected, setFunctionDetected] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Simple function to process function calls (replacement for missing service)
  const processPossibleFunctionCall = (text) => {
    try {
      const parsed = JSON.parse(text);
      const isFunction = parsed.function && parsed.arguments;
      return {
        isJSON: true,
        isFunction: isFunction,
        parsed: parsed,
        functionName: parsed.function,
        arguments: parsed.arguments
      };
    } catch (error) {
      return {
        isJSON: false,
        isFunction: false,
        parsed: null,
        error: error.message
      };
    }  };
  
  // Handle input changes
  const handleInputChange = (e) => {
    const text = e.target.value;
    setDemoText(text);
    
    try {
      // Try to parse as JSON
      const processed = processPossibleFunctionCall(text);
      setIsJsonValid(processed.isJSON);
      setFunctionDetected(processed.isFunction);
      setResult(processed);
    } catch (error) {
      setIsJsonValid(false);
      setFunctionDetected(false);
      setResult(null);
    }
  };
  
  // Sample JSON function call examples
  const examples = [
    {
      name: "Open Weather App",
      json: `{
  "function": "openApp",
  "arguments": {
    "appName": "Weather"
  }
}`    },
    {
      name: "Show Data Example",
      json: `{
  "function": "showData",
  "arguments": {
    "data": {
      "temperature": 72,
      "humidity": 45,
      "forecast": "Sunny"
    }
  }
}`
    },
    {
      name: "Close Current App",
      json: `{
  "function": "closeApp",
  "arguments": {}
}`
    },
    {
      name: "Alternative Open App Format",
      json: `{
  "action": "openApp",
  "parameters": {
    "appName": "Calendar"
  }
}`    },
    {
      name: "Start Timer",
      json: `{
  "function": "startTimer",
  "arguments": {
    "duration": 300,
    "label": "Tea"
  }
}`
    }
  ];
  
  // Load example into editor
  const loadExample = (exampleJson) => {
    setDemoText(exampleJson);
    const processed = processPossibleFunctionCall(exampleJson);
    setIsJsonValid(processed.isJSON);
    setFunctionDetected(processed.isFunction);
    setResult(processed);
  };

  // Function to execute the current JSON directly in the demo
  const executeJson = () => {
    try {
      const processed = processPossibleFunctionCall(demoText);
      if (processed.isFunction) {
        setTestResult({
          success: true,
          message: `Function "${processed.functionData.name}" would be executed with the provided arguments.`
        });
        
        // If we're in the app, notify the parent App component to actually execute the function
        if (window.notify) {
          window.notify({
            title: 'Function Call',
            message: `Executing: ${processed.functionData.name}`,
            type: 'info'
          });
        }
        
        // If this is the parent window, we could dispatch an event
        window.dispatchEvent(
          new CustomEvent('function-call', { 
            detail: processed.functionData 
          })
        );
      } else if (processed.isJSON) {
        setTestResult({
          success: true,
          message: "Valid JSON but not recognized as a function call pattern."
        });
      } else {
        setTestResult({
          success: false,
          message: "Not valid JSON. Please check your syntax."
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `Error: ${error.message}`
      });
    }
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <button onClick={onClose} className="text-xs text-blue-300">← Back</button>
        <h2 className="text-lg font-light">Function Call Demo</h2>
        <div></div>
      </div>
      
      <div className="flex flex-col flex-1 space-y-4">
        <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-800/30 text-sm text-blue-200">
          <p>This app demonstrates JARVIS's ability to process JSON-formatted responses as function calls.</p>
          <p className="mt-2">Try typing or pasting JSON that matches one of the function formats, or select an example below.</p>
        </div>
        
        <div className="flex-1 flex space-x-4">
          {/* JSON Input */}
          <div className="w-1/2">
            <h3 className="text-blue-300 text-sm mb-2">JSON Input</h3>
            <textarea 
              className="w-full h-full min-h-[200px] bg-gray-900/70 text-blue-100 p-3 rounded-lg border border-blue-800/30 font-mono text-sm"
              value={demoText}
              onChange={handleInputChange}
              placeholder="Paste JSON here..."
            />
          </div>
          
          {/* Result Display */}
          <div className="w-1/2">
            <h3 className="text-blue-300 text-sm mb-2">
              Result
              {isJsonValid && (
                <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-blue-800/30 border border-blue-700/30">
                  Valid JSON
                </span>
              )}
              {functionDetected && (
                <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-teal-800/30 border border-teal-700/30">
                  Function Detected
                </span>
              )}
            </h3>
            <div className="h-full min-h-[200px] bg-gray-900/70 p-3 rounded-lg border border-blue-800/30 overflow-auto">
              {result ? (
                <div>
                  {result.isJSON ? (
                    <div>
                      {result.isFunction ? (
                        <div>
                          <div className="text-teal-300 text-sm mb-2">Function Call:</div>
                          <div className="mb-2">
                            <span className="text-blue-300 font-mono">Name: </span>
                            <span className="text-blue-100 font-semibold">{result.functionData.name}</span>
                          </div>
                          <div>
                            <span className="text-blue-300 font-mono">Arguments:</span>
                            <pre className="mt-1 text-xs bg-blue-900/30 p-2 rounded overflow-auto max-h-40 font-mono text-blue-200">
                              {JSON.stringify(result.functionData.arguments, null, 2)}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-blue-300 text-sm mb-2">Valid JSON (not a function call):</div>
                          <pre className="text-xs bg-blue-900/30 p-2 rounded overflow-auto max-h-40 font-mono text-blue-200">
                            {JSON.stringify(result.jsonData, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-blue-200">
                      <p>Not valid JSON. Try one of the examples below.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-blue-300/50 font-mono">No input yet...</div>
              )}
            </div>
          </div>
        </div>
        
        {/* Examples */}
        <div>
          <h3 className="text-blue-300 text-sm mb-2">Examples</h3>
          <div className="flex space-x-3 flex-wrap">
            {examples.map((example, index) => (
              <button
                key={index}
                className="px-3 py-2 bg-blue-900/20 hover:bg-blue-800/30 border border-blue-800/30 rounded text-xs text-blue-200 mb-2"
                onClick={() => loadExample(example.json)}
              >
                {example.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Execute Button */}
        <div className="mb-4">
          <button
            className="px-4 py-2 bg-green-800/30 hover:bg-green-700/40 border border-green-700/30 rounded text-sm text-green-200 flex items-center"
            onClick={executeJson}
            disabled={!isJsonValid}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Execute Function Call
          </button>
          <p className="text-xs text-blue-300/70 mt-1">
            Tests the function call directly in the interface
          </p>
        </div>

        {/* Add test result display */}
        {testResult && (
          <div className={`p-3 mt-3 rounded-lg border ${testResult.success ? 'bg-blue-900/30 border-blue-600/30 text-blue-200' : 'bg-red-900/30 border-red-600/30 text-red-200'}`}>
            <div className="flex items-start">
              <div className={`mr-2 mt-0.5 w-4 h-4 flex-shrink-0 ${testResult.success ? 'text-blue-400' : 'text-red-400'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {testResult.success ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
              </div>
              <div className="text-sm">{testResult.message}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FunctionDemoApp;
