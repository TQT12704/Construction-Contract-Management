📄 Contract Management System

A full-stack web application for managing contracts, customers, and payments in a business environment.
This project was rebuilt and enhanced based on real-world requirements from an enterprise internship.

🚀 Features
🔐 Authentication & Authorization
JWT-based authentication using Spring Security
Role-based access control (Admin, Accountant, Sales, Project Manager)
📑 Contract Management
Create, update, and track contract lifecycle
Manage contract status and related information
💳 Payment Tracking
Record and monitor payment progress
Update payment status for each contract
👥 Customer Management
Store and manage customer information
Link customers with contracts
📊 Reporting
View system data and generate basic reports
🛠️ Tech Stack
Backend
Java, Spring Boot
Spring Security (JWT Authentication)
Spring Data JPA / Hibernate
Frontend
ReactJS
Database
PostgreSQL
Tools
Postman (API Testing)
Git & GitHub
🏗️ System Architecture
RESTful API design
MVC architecture (Controller – Service – Repository)
Separation between frontend and backend
⚙️ Installation & Setup
1. Clone repository
git clone https://github.com/TQT12704/Construction-Contract-Management.git
cd contract-management-system
2. Backend Setup (Spring Boot)
cd backend
./mvnw spring-boot:run
Configure database in application.properties:
spring.datasource.url=jdbc:postgresql://localhost:1207/project
spring.datasource.username=postgres
spring.datasource.password=Quangtien12@
3. Frontend Setup (React)
cd frontend
npm install
npm start
🔑 API Overview
Method	Endpoint	Description
POST	/api/auth/login	User login
GET	/api/contracts	Get all contracts
POST	/api/contracts	Create new contract
PUT	/api/contracts/{id}	Update contract
GET	/api/payments	Get payment list
🔒 Security
Implemented JWT authentication
Secured endpoints using Spring Security
Role-based authorization for different user types
📌 Future Improvements
Pagination & filtering APIs
Advanced reporting dashboard
Docker deployment
Performance optimization
Unit & integration testing
