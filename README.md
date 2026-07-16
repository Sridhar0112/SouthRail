# SouthRail Reservation Platform

**A modern, secure, and scalable railway reservation system** designed for South Indian railway routes.

![Java](https://img.shields.io/badge/Java-21-007396?style=for-the-badge&logo=openjdk)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.5-6DB33F?style=for-the-badge&logo=springboot)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=for-the-badge&logo=docker)

---

## Overview

SouthRail is a full-stack enterprise-grade railway reservation platform that delivers a seamless booking experience with robust security, real-time features, and comprehensive administrative capabilities.

Built with industry best practices, the system supports user authentication, train search, multi-passenger bookings, PNR management, cancellations with refunds, AI-assisted support, and admin operations.

---

## Features

### 🔐 Authentication & Security
- Secure user registration and login with JWT (Access + Refresh tokens)
- Email verification and password management flows
- Account lockout protection and self-service unlock
- Role-Based Access Control (RBAC) – User & Admin roles
- Secure account deletion with token revocation

### 🚄 Core Railway Operations
- Advanced train search (source, destination, date, class, quota)
- Real-time seat availability and berth preference selection
- Multi-passenger booking with automatic PNR generation
- Booking history, upcoming journeys, and PNR tracking
- Cancellation workflow with refund estimation

### 👤 User Experience
- Responsive, modern UI with light/dark mode support
- Personalized dashboard with booking analytics
- PDF ticket generation and download
- AI-powered chat assistance (Gemini integration)

### 🛠️ Administrative Dashboard
- Complete CRUD operations for Trains, Stations, Routes, and Users
- Booking oversight and management
- Support ticket system with messaging
- Audit logging for operational transparency

---

## Technology Stack

### Backend
- **Java 21** + **Spring Boot 3.3.5**
- Spring Security, Spring Data JPA, Spring Validation
- JWT Authentication (JJWT)
- PostgreSQL with JPA repositories
- OpenPDF for ticket generation
- Spring Mail + WebFlux (Gemini AI)
- OpenAPI (Swagger) documentation

### Frontend
- **React 18** + **Vite**
- Material-UI (MUI v6) with custom theming
- Redux Toolkit for state management
- Axios with interceptors for API communication
- React Router, React Hook Form + Zod validation

### Infrastructure
- **Docker** + **Docker Compose**
- Nginx reverse proxy (deployment ready)
- PostgreSQL 16
- Maven build system

---

## Project Structure

```bash
SouthRail/
├── backend/                 # Spring Boot application
├── frontend/                # React frontend
├── database/                # SQL schema, seed & migration scripts
├── deploy/nginx/            # Production Nginx configuration
├── docs/                    # Postman collection & deployment guide
├── docker-compose.yml
└── README.md
```

---

## Quick Start

### Prerequisites
- Docker and Docker Compose (recommended)
- Git

### Local Deployment

```bash
git clone https://github.com/Sridhar0112/SouthRail.git
cd SouthRail

# Start the full stack
docker-compose up --build -d
```

**Access Points:**
- **Frontend**: http://localhost:8088
- **Backend API**: http://localhost:8080
- **Swagger UI**: http://localhost:8080/swagger-ui.html

Database is automatically initialized with schema and seed data.

---

## Production Deployment

Refer to [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for detailed production setup instructions, including:

- Environment variable configuration
- HTTPS setup with Nginx
- Secret management (JWT, database, Gemini API key)
- Monitoring recommendations

**Important Production Steps:**
- Replace default `JWT_SECRET` with a strong, randomly generated value
- Configure production SMTP credentials
- Enable proper logging and monitoring
- Secure management endpoints

---

## API Documentation

- Interactive Swagger UI available at `/swagger-ui.html`
- Full Postman collection: `docs/SouthRail.postman_collection.json`

---

## Security Considerations

- JWT token rotation and revocation
- BCrypt password hashing
- Input validation and sanitization
- Global exception handling
- CORS configured for frontend
- Audit logging for sensitive operations

---

## Database

- PostgreSQL 16
- Well-normalized schema with proper constraints and indexes
- Seed data for stations, trains, and test users

---


## Future Roadmap

- Payment gateway integration
- Real-time seat locking and notifications
- SMS integration
- Advanced analytics dashboard
- Multi-language support
- Mobile application

---

## Contributing

Contributions are welcome. Please follow standard Git workflow and ensure code adheres to existing architecture and security standards.

---

## License

This project is developed for demonstration and portfolio purposes. All rights reserved by the author.

---

**SouthRail – Streamlining Railway Reservations with Modern Technology**
