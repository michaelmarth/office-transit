# Office Transit PWA

A minimalist Progressive Web App (PWA) that allows users to quickly view the fastest public transport connection between home and office using Swiss public transport data.

## Features

- Two primary actions: "Go to Office" and "Go Home"
- Fetches the fastest public transport route between predefined locations in real-time
- Shows only the next best connection
- Displays departure and arrival times, travel duration, platform numbers, and full journey breakdown
- User-configurable home and office stations
- Installable as a PWA on mobile devices

## Technical Details

- Built with HTML, CSS, and vanilla JavaScript (no frameworks)
- Uses the Transport.opendata.ch API for Swiss public transport data
- Implements PWA features for installation on mobile devices
- Stores user preferences in local storage

## Getting Started

1. Clone the repository
2. Open `index.html` in a web browser
3. Configure your home and office stations
4. Start using the app to check your connections

## API

This app uses the [Transport.opendata.ch API](https://transport.opendata.ch/), which provides Swiss public transport data.

## License

MIT 