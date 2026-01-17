import DrWattsContainer from './components/dr-watts/DrWattsContainer';
import StravaSuccess from './components/dr-watts/StravaSuccess';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { useEffect } from 'react';

function App() {
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data === 'strava-auth-success') {
                // Trigger a custom event to notify all listeners
                window.dispatchEvent(new Event('strava-token-update'));
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    return (
        <BrowserRouter>
            <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col items-center justify-center p-4">
                <Routes>
                    <Route path="/" element={<DrWattsContainer />} />
                    <Route path="/strava-success" element={<StravaSuccess />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

export default App;
