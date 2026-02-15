# Media Import

![Media Import Banner](https://img.shields.io/badge/Media%20Import-v1.0.0-blue?style=for-the-badge) ![Platform](https://img.shields.io/badge/Platform-macOS%20(Apple%20Silicon)-lightgrey?style=for-the-badge) ![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**The blazing fast, no-nonsense media importer for professionals.**

Media Import does one thing and does it perfectly: safely transfers your photos and videos from source to destination at the maximum speed your hardware allows. No databases, no proprietary libraries, just raw performance.

## 🛑 The Problem

We built this because:
1.  **No Native Solution**: macOS lacks a simple, dedicated tool for mass media ingestion that just works.
2.  **Bloatware Fatigue**: Existing "free" applications are often slow, buggy, or try to sell you cloud services you don't need.
3.  **Speed**: Most importers throttle your high-speed SD cards. Media Import unlocks their full potential.

---

## 🚀 Why Media Import?

In a world of bloated software that tries to do everything, Media Import respects your time and your system resources.

### ⚡ Blazing Fast Performance
Achieve transfer speeds of **up to 500 MB/s** (dependent on your drive speed). 
- **Direct Binary Copy**: Uses low-level system calls (`fs.copyFile`) to clone data bit-for-bit.
- **Zero Overhead**: No unnecessary processing, re-encoding, or metadata stripping.
- **Parallel Processing**: Optimized concurrency ensures your CPU remains idle while your disk does the work.

### 🛡️ Iron-Clad Reliability
- **Atomic Operations**: Files are either fully copied or not at all. No corrupted half-files.
- **Metadata Preservation**: 100% of your EXIF data, timestamps, and camera settings are preserved.
- **Duplicate Detection**: Smart collision handling prevents overwriting existing files.

### 🪶 Ultra Lightweight
- **Negligible RAM Usage**: Runs efficiently in the background without slowing down your editing workflow.
- **Tiny Footprint**: No heavy background services or daemons.
- **Instant Launch**: Opens in milliseconds.

### ✨ Zero Setup
- **Portable**: Download, open, and start importing. No configuration wizards, no accounts, no "library" setup.
- **Smart Memory**: Automatically remembers your last used directories for a seamless workflow.

---

## 🛠 Features

- **Smart Scanning**: Instantly identifies new photos and videos.
- **Real-Time Feedback**: Watch files transfer live with immediate visual confirmation.
- **Smart Sorting**: 📅 **Auto-Categorization** into `YYYYMMDD` folders locally. No more messy "Import" folders.
- **Deep Scan**: 🔍 **Recursive Import** finds every single image and video file, even if they are buried 10 folders deep in your source drive.
- **Video Safety**: specialized handling for large video files (.MOV, .MP4) to prevent system freezes.
- **Drag & Drop UI**: Beautiful, modern interface designed for clarity.
- **Graceful Stop**: Cancel imports instantly and safely at any time.

---

## 📥 Installation

1.  Download the latest release for macOS (Apple Silicon).
2.  Drag **Media Import.app** to your `Applications` folder.
3.  Launch and enjoy.

> *Note: This application is currently optimized for macOS on Apple Silicon (M1/M2/M3 and above).*

---

## 🤝 Contributing

We believe in open software. If you're a developer and want to make Media Import even better, we welcome your contributions!

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

### Development Setup

```bash
# Clone the repo
git clone https://github.com/yourusername/media-import.git

# Install dependencies
npm install

# Run locally
npm run dev

# Build for production
npm run build
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Built with ❤️ for photographers and videographers who value speed.*
