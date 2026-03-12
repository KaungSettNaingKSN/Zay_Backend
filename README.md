# Zay Client

Frontend storefront for the **Zay E-Commerce Platform**.  
This application allows customers to browse products, manage their cart, and complete purchases through a modern and responsive shopping interface.

---

## Features

- User authentication with Firebase
- Browse and search products
- Product detail page with image zoom
- Add to cart functionality
- Wishlist system
- Product reviews and ratings
- Advanced product filtering
- Checkout with Stripe payment integration
- Order tracking
- Responsive design for mobile and desktop
- Lazy loading images for better performance
- Toast notifications for user feedback

---

## Tech Stack

Frontend

- React
- Vite
- Tailwind CSS
- Material UI
- React Router

Libraries

- Axios
- Firebase Authentication
- Stripe Payment Integration
- Swiper
- React Icons
- React Hot Toast

---

## Related Repositories

Backend API  
https://github.com/KaungSettNaingKSN/Zay_Backend

Admin Dashboard  
https://github.com/KaungSettNaingKSN/Zay_Admin

---

## Installation

Clone the repository

```bash
git clone https://github.com/KaungSettNaingKSN/Zay_Client.git
```

Navigate into the project

```bash
cd Zay_Client
```

Install dependencies

```bash
npm install
```

Start the development server

```bash
npm run dev
```

---

## Environment Variables

Create a `.env` file in the project root.

```
VITE_API_URL=your_backend_api_url

VITE_FIREBASE_APP_APIKEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

Never commit real API keys to public repositories.

---

## Available Scripts

Run development server

```
npm run dev
```

Build for production

```
npm run build
```

Preview production build

```
npm run preview
```

---

## Project Structure

```
src
 ├── components
 ├── pages
 ├── hooks
 ├── services
 ├── utils
 ├── assets
 └── App.jsx
```

---

## Future Improvements

- Multi-language support
- Product recommendation system
- Email notifications for orders
- Mobile app version

---

## Author

Kaung Sett Naing

GitHub  
https://github.com/KaungSettNaingKSN
