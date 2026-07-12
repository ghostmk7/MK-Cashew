function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // We get the raw text data directly
    const rawText = e.postData.contents;
    
    // Split the data into chunks of 45,000 characters to bypass the 50,000 limit
    const chunks = rawText.match(/.{1,45000}/g) || [];
    
    // Clear previous backup
    sheet.clear();
    
    // Write chunks down column A
    const rows = chunks.map(chunk => [chunk]);
    if (rows.length > 0) {
      sheet.getRange(1, 1, rows.length, 1).setValues(rows);
    }
    
    // Write the timestamp in B1
    sheet.getRange("B1").setValue(new Date().toISOString());
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Read all rows in column A
    const lastRow = sheet.getLastRow();
    if (lastRow === 0) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: {} }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const values = sheet.getRange(1, 1, lastRow, 1).getValues();
    
    // Reconstruct the full string
    const fullString = values.map(row => row[0]).join("");
    
    let data = {};
    if (fullString) {
      data = JSON.parse(fullString);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: data }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
