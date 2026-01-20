#!/usr/bin/env node

/**
 * Simple script to view client logs in a readable format
 * Usage: node view-client-logs.js [date]
 * Example: node view-client-logs.js 2024-01-15
 */

const fs = require('fs');
const path = require('path');

// Get date from command line or use today
const date = process.argv[2] || new Date().toISOString().split('T')[0];
const logFile = path.join(__dirname, 'client-logs', `client-logs-${date}.json`);

console.log(`📋 Client Logs for ${date}`);
console.log('='.repeat(50));

if (!fs.existsSync(logFile)) {
  console.log(`❌ No log file found for ${date}`);
  console.log(`Expected: ${logFile}`);
  process.exit(1);
}

try {
  const logData = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  
  if (logData.length === 0) {
    console.log('📝 No logs found for this date');
    process.exit(0);
  }

  logData.forEach((session, index) => {
    console.log(`\n🔍 Session ${index + 1}:`);
    console.log(`   Time: ${session.timestamp}`);
    console.log(`   IP: ${session.clientIP}`);
    console.log(`   URL: ${session.url}`);
    console.log(`   User Agent: ${session.userAgent}`);
    console.log(`   Logs: ${session.logs.length} entries`);
    
    // Show recent errors
    const errors = session.logs.filter(log => log.level === 'error');
    if (errors.length > 0) {
      console.log(`   ❌ Errors: ${errors.length}`);
      errors.forEach(error => {
        console.log(`      • ${error.message}`);
        if (error.error && error.error !== error.message) {
          console.log(`        ${error.error}`);
        }
      });
    }
    
    console.log('   ' + '-'.repeat(40));
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total sessions: ${logData.length}`);
  console.log(`   Total log entries: ${logData.reduce((sum, session) => sum + session.logs.length, 0)}`);
  console.log(`   Total errors: ${logData.reduce((sum, session) => sum + session.logs.filter(log => log.level === 'error').length, 0)}`);

} catch (error) {
  console.error('❌ Error reading log file:', error.message);
  process.exit(1);
}
