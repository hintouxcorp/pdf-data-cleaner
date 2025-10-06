# pdf-data-cleaner
PDF Data Cleaner is a web application built with Python and Django for extracting and cleaning data from PDF files.
The system allows users to upload PDF files, automatically extract text using libraries like PyPDF2 or pdfplumber, and clean the data by removing special characters, extra spaces, and blank lines.

After processing, users can view the cleaned text directly in the web interface and export it in .txt or .csv format.

🚀 Main Features

-  PDF file upload
-  Automatic text extraction
-  Data cleaning and formatting
-  Web preview of processed text
-  Export to .txt or .csv

🧠 Tech Stack

-  Backend: Python, Django, pdfplumber (or PyPDF2), Pandas
-  Frontend: HTML, CSS, JavaScript
-  Database: SQLite (Django default)

⚙️ How to Run

Clone this repository:

git clone https://github.com/your-username/pdf-data-cleaner.git
cd pdf-data-cleaner


Create and activate a virtual environment:

python -m venv venv
venv\Scripts\activate      # Windows
# or
source venv/bin/activate   # Linux / Mac


Install dependencies:
pip install -r requirements.txt


Run Django migrations:
python manage.py migrate


Start the local server:
python manage.py runserver


Open in your browser:
http://127.0.0.1:8000
