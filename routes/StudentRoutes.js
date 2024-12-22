const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');

const router = express.Router();

// Set up multer storage for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './upload'); // 'upload' folder for storing files
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Keep the original filename
  },
});

const upload = multer({ storage: storage });

// Helper function to ensure the flags are mapped correctly
const calculatePassFail = (flag) => {
  const trimmedFlag = flag ? flag.trim().toUpperCase() : ''; // Trim and convert to uppercase
  if (trimmedFlag === 'P' || trimmedFlag === 'PASS') {
    return 'P'; // Return 'P' for Pass
  } else if (trimmedFlag === 'F' || trimmedFlag === 'FAIL') {
    return 'F'; // Return 'F' for Fail
  }
  return 'F'; // Default to 'F' if the value is unexpected
};

// Route to handle file upload and process the data
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', 'upload', req.file.filename);

    // Read the Excel file
    const workbook = xlsx.readFile(filePath);
    const studentSheet = workbook.Sheets['Student'];
    const marksSheet = workbook.Sheets['Marks'];

    // Parse data from Excel sheets
    const studentData = xlsx.utils.sheet_to_json(studentSheet);
    const marksData = xlsx.utils.sheet_to_json(marksSheet);

    console.log('Parsed Student Data:', studentData); // Debug log for student data
    console.log('Parsed Marks Data:', marksData); // Debug log for marks data

    // Map student data with marks
    const studentMarksData = studentData.map((student) => {
      const studentMarks = marksData.filter(
        (mark) => mark.HallTicket.trim() === student.HallTicket.trim()
      );

      return {
        hall_ticket: student.HallTicket.trim(), // Use "HallTicket" as the unique key
        name: student.StudentName,
        college: student.CollegeName,
        course: student.Course,
        marks: studentMarks.map((mark) => ({
          subject_code: mark.SubjectCode,
          subject_name: mark.SubjectName,
          external_marks: mark.ExtMarks,
          external_flag: calculatePassFail(mark.ExtFlag), // Calculate external flag (P or F)
          internal_marks: mark.IntMarks,
          internal_flag: calculatePassFail(mark.IntFlag), // Calculate internal flag (P or F)
          result: mark.Result, // Use the Result column directly from the Marks sheet
        })),
      };
    });

    // Store the data globally
    global.studentMarksData = studentMarksData;

    console.log('Uploaded Student Marks Data:', studentMarksData); // Debug log for mapped data
    res.json({ message: 'Data uploaded successfully', data: studentMarksData });
  } catch (error) {
    console.error('Error processing file:', error.message); // Debug log for errors
    res.status(500).json({ message: 'Error processing file', error: error.message });
  }
});

// Route to fetch student details and marks by Hall Ticket Number
router.get('/:hallTicketNumber', (req, res) => {
  const hallTicketNumber = req.params.hallTicketNumber.trim().toLowerCase(); // Normalize input
  console.log('Received Hall Ticket Number:', hallTicketNumber); // Debug log for request
  console.log('Available Student Marks Data:', global.studentMarksData); // Debug log for stored data

  if (!global.studentMarksData) {
    return res.status(404).json({ message: 'Data not uploaded yet' });
  }

  // Special case for 'y' or 'Y': Return all student data
  if (hallTicketNumber === 'y') {
    return res.json({ students: global.studentMarksData });
  }

  const student = global.studentMarksData.find(
    (s) => s.hall_ticket.toLowerCase() === hallTicketNumber
  );

  if (student) {
    console.log('Found Student Data:', student); // Debug log for found student
    return res.json({ student, marks: student.marks });
  }

  console.warn(`Student with Hall Ticket ${hallTicketNumber} not found`); // Warning log
  res.status(404).json({ message: 'Student not found' });
});

module.exports = router;
