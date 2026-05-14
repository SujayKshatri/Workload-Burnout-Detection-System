# 🍏 Zero Leftovers

Zero Leftovers is an AI-powered mobile application designed to eliminate household food waste. Simply scan the contents of your fridge, and the app uses machine learning to identify your ingredients and instantly suggest recipes—prioritizing items that are likely to spoil soon.

## ✨ Features
- **📸 AI Ingredient Scanner:** Uses YOLOv5 Computer Vision to instantly detect food items from your camera.
- **🧠 Smart Recipe Matching:** Custom algorithm prioritises recipes that use your highly perishable ingredients.
- **📦 AR Overlays:** Real-time bounding boxes highlight detected ingredients on your screen.
- **✍️ Manual Fallback:** Easily edit, add, or remove ingredients via the clean mobile UI.

## 🛠️ Tech Stack
- **Frontend:** React Native, Expo, React Navigation
- **Backend:** Python, FastAPI, Uvicorn
- **Machine Learning:** PyTorch, YOLOv5, OpenCV, Tesseract OCR
- **Data:** Custom JSON NoSQL schema, Pandas

## 🏗️ Architecture
The mobile app captures an image and transmits it via multipart form-data to the Python backend. The backend decodes the image using OpenCV, runs inference through a pre-trained YOLOv5 model, and performs OCR for text labels. The frontend dynamically renders bounding boxes using normalised coordinates. A custom scoring engine calculates the best recipes based on ingredient intersection and perishable weightings.

## 🚀 Installation & Setup

### Backend
1. `cd backend`
2. Create a virtual environment: `python -m venv venv`
3. Activate it: `source venv/bin/activate` (Mac/Linux) or `venv\Scripts\activate` (Windows)
4. Install dependencies: `pip install -r requirements.txt`
5. *Note: Ensure Tesseract OCR is installed on your system.*
6. Run the server: `uvicorn main:app --reload`

### Frontend
1. `cd frontend`
2. Install dependencies: `npm install`
3. Update `API_URL` in `src/api/client.js` to match your local network IP (e.g., `http://192.168.x.x:8000/api`).
4. Start Expo: `npx expo start`
5. Scan the QR code with the Expo Go app on your physical device (Camera requires a physical device).

## 📸 Screenshots
*(Add placeholders for screenshots here)*
| Home Screen | Camera Scanner | Recipe Results |
|:---:|:---:|:---:|
| `<img src="docs/home.png" width="200"/>` | `<img src="docs/scan.png" width="200"/>` | `<img src="docs/recipes.png" width="200"/>` |

## 🔮 Future Roadmap
- [ ] Migrate from JSON DB to PostgreSQL for scalable querying.
- [ ] Implement user accounts and saved recipes.
- [ ] Transition inference to On-Device ML (CoreML) for zero-latency scanning.

## 🤝 Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.
