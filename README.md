# Sahaay AI - Voice-First Civic Access Assistant

Sahaay AI is an AI-powered, voice-first civic access assistant designed to help Indian citizens access government schemes and public services. The system addresses critical barriers including language limitations, low digital literacy, and fragmented information across government portals.

## 📋 Key Documents for Hackathon Submission

- **[REQUIREMENTS.md](./REQUIREMENTS.md)** - Complete requirements with 10 user stories and 50 acceptance criteria
- **[DESIGN.md](./DESIGN.md)** - Technical architecture and system design overview
- **[README.md](./README.md)** - This file with project overview and setup instructions

## Features

- **Voice-First Interaction**: Natural language interaction in 5 major Indian languages (Hindi, English, Tamil, Telugu, Bengali)
- **Government Scheme Discovery**: AI-powered matching of user needs to relevant government schemes
- **Eligibility Assessment**: Intelligent evaluation of scheme eligibility with clear explanations
- **Document Guidance**: Complete checklists and explanations of required documents
- **Step-by-Step Action Plans**: Clear guidance on application processes and next steps
- **Offline-First Design**: Works with limited connectivity and provides cached information
- **Privacy-Focused**: Local processing of personal data with automatic cleanup
- **Accessibility**: Designed for users with disabilities and limited digital literacy

## Technology Stack

- **Backend**: Node.js with TypeScript
- **Framework**: Express.js
- **Testing**: Jest with fast-check for property-based testing
- **Voice Processing**: Whisper (STT) + Local/Cloud TTS
- **Language Processing**: Multilingual BERT for intent recognition
- **Data Validation**: Joi schema validation
- **Logging**: Winston with privacy-aware logging

## Project Structure

```
sahaay-ai/
├── src/
│   ├── config/          # Environment and configuration
│   ├── interfaces/      # TypeScript interfaces for services
│   ├── middleware/      # Express middleware
│   ├── services/        # Business logic services
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   └── index.ts         # Application entry point
├── tests/
│   ├── utils/           # Unit tests for utilities
│   └── setup.ts         # Test configuration
├── config/              # Configuration files
└── docs/                # Documentation
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd sahaay-ai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Build the project:
```bash
npm run build
```

### Development

Start the development server:
```bash
npm run dev
```

Run tests:
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run property-based tests only
npm run test:property

# Run with coverage
npm run test:coverage
```

Lint and format code:
```bash
npm run lint
npm run format
```

### Testing Strategy

The project uses a dual testing approach:

- **Unit Tests**: Test specific examples, edge cases, and integration points
- **Property-Based Tests**: Verify universal properties across randomized inputs using fast-check

Property tests validate the correctness properties defined in the design document, ensuring the system behaves correctly across all possible inputs.

## API Endpoints

### Health Check
- `GET /health` - System health status

### Voice Interface
- `POST /api/voice/stt` - Speech-to-text conversion
- `POST /api/voice/tts` - Text-to-speech synthesis

### Scheme Discovery
- `POST /api/schemes/discover` - Find relevant schemes
- `GET /api/schemes/:id` - Get scheme details
- `POST /api/schemes/search` - Search schemes by name

### Eligibility Assessment
- `POST /api/eligibility/assess` - Assess scheme eligibility
- `POST /api/eligibility/questions` - Get eligibility questions

### Document Management
- `GET /api/documents/requirements/:schemeId` - Get required documents
- `POST /api/documents/validate` - Validate document completeness

### Action Guidance
- `POST /api/actions/plan` - Generate action plan
- `GET /api/actions/offices` - Get office information

## Configuration

Key environment variables:

- `NODE_ENV`: Environment (development/production/test)
- `PORT`: Server port (default: 3000)
- `LOG_LEVEL`: Logging level (error/warn/info/debug)
- `STT_SERVICE`: Speech-to-text service (whisper/cloud/hybrid)
- `TTS_SERVICE`: Text-to-speech service (local/cloud/hybrid)
- `SUPPORTED_LANGUAGES`: Comma-separated language codes
- `API_SETU_BASE_URL`: API Setu base URL for government data
- `PROPERTY_TEST_ITERATIONS`: Number of iterations for property tests

## Privacy and Security

- Personal information is processed locally without permanent storage
- Session data is automatically cleaned up after conversations
- Analytics data is anonymized without personal identifiers
- Input sanitization prevents injection attacks
- Privacy-aware logging redacts sensitive information

## Accessibility

- Complete voice-only functionality for visually impaired users
- Text-only mode with visual feedback for hearing impaired users
- Voice command navigation for motor impaired users
- High contrast display and readable fonts
- Consistent navigation across devices and screen sizes

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Ensure all tests pass: `npm test`
5. Lint your code: `npm run lint`
6. Commit your changes: `git commit -m 'Add feature'`
7. Push to the branch: `git push origin feature-name`
8. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the GitHub repository.