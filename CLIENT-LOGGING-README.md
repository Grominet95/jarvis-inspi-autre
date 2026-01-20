# 📱 Client Logging System

A lightweight debugging system to capture client-side errors and send them to the server for analysis.

## 🎯 Purpose

This system helps debug issues on devices where you can't access the browser console (like Android TV), by automatically capturing JavaScript errors and sending them to the server.

## 📂 Files Modified

- `server.js` - Added `/api/client-logs` endpoint
- `src/services/serviceUtils.js` - Enhanced logging with server communication
- `src/index.js` - Added global error handlers
- `view-client-logs.js` - Script to view logs in readable format

## 🚀 How It Works

1. **Client-side**: Captures all JavaScript errors, unhandled promises, and log messages
2. **Buffering**: Logs are buffered and sent every 5 seconds to avoid spam
3. **Server-side**: Logs are saved to daily JSON files in `client-logs/` directory
4. **Viewing**: Use the provided script to view logs in a readable format

## 📋 Log File Structure

Logs are saved as: `client-logs/client-logs-YYYY-MM-DD.json`

Each entry contains:
- `timestamp` - When the log was created
- `clientIP` - Client's IP address
- `userAgent` - Browser/device information
- `url` - Page URL where error occurred
- `logs` - Array of log entries with level, message, error details

## 🔍 Viewing Logs

### Command Line:
```bash
# View today's logs
node view-client-logs.js

# View specific date
node view-client-logs.js 2024-01-15

# View raw JSON (with jq if installed)
cat client-logs/client-logs-$(date +%Y-%m-%d).json | jq .
```

### Manual Inspection:
```bash
# List all log files
ls -la client-logs/

# View raw file
cat client-logs/client-logs-2024-01-15.json
```

## 🎮 Testing the System

1. **Start the server**: `node server.js`
2. **Visit the site** from any device (including Android TV)
3. **Check server console** for: `📱 Client log received from [IP]: X entries`
4. **View logs**: `node view-client-logs.js`

## 🔧 Manual Log Flushing

You can manually flush logs from the browser console:
```javascript
// Force send all buffered logs immediately
window.flushClientLogs();
```

## 📊 What You'll See

For the Android TV white page issue, you'll likely see:
- **Page Load Started** - Confirms the page is loading
- **JavaScript errors** - What's breaking the app
- **React rendering failures** - If React fails to mount
- **Network errors** - Failed API calls
- **Device information** - User agent, IP, etc.

## 🛡️ Privacy & Security

- Logs are stored locally on your server
- No sensitive data is captured (passwords, tokens, etc.)
- Only error messages and stack traces are logged
- IP addresses are logged for debugging purposes only

## 🧹 Cleanup

Log files will accumulate over time. You may want to periodically clean them:
```bash
# Remove logs older than 7 days
find client-logs/ -name "*.json" -mtime +7 -delete
```

## 🚨 Troubleshooting

If logs aren't appearing:
1. Check server console for `📱 Client log received` messages
2. Verify the client can reach `/api/client-logs` endpoint
3. Check browser network tab for failed POST requests
4. Try manual flush: `window.flushClientLogs()`

This system should help you identify exactly what's causing the white page issue on Android TV!

