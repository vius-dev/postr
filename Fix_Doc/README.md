# Postr - MVP

A social media application built with React Native, Expo, and a mock high-fidelity backend.

## 📱 Features

-   **Feed**: Chronological timeline with posts, reposts, and threaded replies.
-   **Composition**: Rich text editor with media support (images) and polls.
-   **Media**: Full-screen image viewer with pinch-to-zoom and swipe gestures.
-   **Profiles**: User profiles with bio, location, and post history.
-   **Realtime**: Simulated notifications and live engagement counters.
-   **Theme**: System/Light/Dark mode support.

## 🚀 How to Run (for Testers)

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Start the Server**
    ```bash
    npx expo start
    ```

3.  **Run on Device/Simulator**
    -   **Android**: Press `a` in the terminal.
    -   **iOS**: Press `i` in the terminal.
    -   **Web**: Press `w` in the terminal.

## 🧪 Testing Instructions

### Core Flows
1.  **Create Post**: Tap the `+` FAB. Try adding text and images.
2.  **View Images**: Tap an image in the feed to open the full-screen viewer.
3.  **Interact**: Like, Repost, and Comment on posts.
4.  **Profile**: Tap a user avatar to visit their profile.

### Notes
-   The app runs in **Mock Mode** by default. No real backend server is required.
-   "Shop" tab has been disabled for this MVP release.
