# ☁️ SkyStore

### Your Personal Cloud Storage Solution

**SkyStore** is a powerful and secure cloud storage application that allows users to manage their digital lives effortlessly. With SkyStore, users can easily upload files to the cloud, organize them efficiently, and access them from anywhere, at any time.

---

## 🚀 Key Features

*   **Effortless Uploads**: Seamlessly upload files to the cloud with a user-friendly interface.
*   **Smart Organization**: Keep your files structured and easy to find.
*   **Anywhere Access**: Access your files from any device with an internet connection.
*   **Secure Sharing**: Share files securely with others via unique, tamper-proof sharing links.
*   **Secure & Reliable**: Built with modern security standards to keep your data safe.

---

## 🛠️ Technology Stack

*   **Frontend**: React.js with advanced UI/UX components.
*   **Backend**: Node.js & Express.
*   **Database**: MongoDB for metadata and user records.
*   **Cloud Storage**: AWS S3 for secure and scalable file persistence.
*   **Authentication**: JWT (JSON Web Tokens) for secure session management.

---

## 📂 Project Structure

```bash
skystore/
├── backend/        # Node.js Express server with S3 integration
└── frontend/       # React development environment
```

---

## ⚙️ Getting Started

### 1. Prerequisites
- Node.js installed.
- MongoDB running locally or a MongoDB Atlas URI.
- AWS S3 Bucket credentials.

### 2. Setup
1. Clone the repository.
2. In the `backend` folder, create a `.env` file and add your credentials:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_uri
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   AWS_REGION=your_region
   S3_BUCKET=your_bucket_name
   JWT_SECRET=your_jwt_secret
   ```
3. Install dependencies and start the application:
   ```bash
   # Backend
   cd backend && npm install && npm run dev
   # Frontend
   cd frontend && npm install && npm start
   ```

---

## 🛡️ Security

We prioritize your privacy. All shared links are generated with unique IDs and session-based access controls to prevent unauthorized access.

---

## 📜 License

This project is licensed under the MIT License.
