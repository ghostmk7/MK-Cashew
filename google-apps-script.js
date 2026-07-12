function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Convert the entire JSON store into a string to save it as a backup
    const jsonString = JSON.stringify(data);
    
    // Save to the very first cell A1, or keep a rolling log
    // For a simple DB, we just overwrite A1
    sheet.getRange("A1").setValue(jsonString);
    sheet.getRange("B1").setValue(new Date().toISOString()); // Last synced time
    
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
    const jsonString = sheet.getRange("A1").getValue();
    
    let data = {};
    if (jsonString) {
      data = JSON.parse(jsonString);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: data }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
