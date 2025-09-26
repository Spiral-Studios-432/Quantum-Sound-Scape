import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { Visualization } from './components/Visualization';
import { StatusDisplay } from './components/StatusDisplay';
import { AboutModal } from './components/AboutModal';
import { SpiralStudiosModal } from './components/SpiralStudiosModal';
import { SoundEngine } from './services/soundEngine';
import type { AppStatus, ChakraPreset, NoiseType } from './types';
import { useAnimationFrame } from './hooks/useAnimationFrame';
import { logoSrc } from './assets/logo.png';

// Preset data
const chakraPresets: ChakraPreset[] = [
    { id: 'sub-bass', name: '40Hz Neuro-Regen', frequency: 40, description: 'Corresponds to Gamma brainwave states, associated with peak focus and cognitive processing.', noiseType: 'brown' },
    { id: 'root', name: 'Root Chakra (Muladhara)', frequency: 256, description: 'Grounding, security, and physical identity. The foundation of our being.', noiseType: 'brown' },
    { id: 'sacral', name: 'Sacral Chakra (Svadhisthana)', frequency: 288, description: 'Creativity, emotions, and sexuality. The center of our feelings and pleasures.', noiseType: 'pink' },
    { id: 'solar', name: 'Solar Plexus (Manipura)', frequency: 320, description: 'Personal power, self-esteem, and will. The core of our personality.', noiseType: 'pink' },
    { id: 'heart', name: 'Heart Chakra (Anahata)', frequency: 341.3, description: 'Love, compassion, and relationships. The bridge between the physical and spiritual.', noiseType: 'pink' },
    { id: 'throat', name: 'Throat Chakra (Vishuddha)', frequency: 384, description: 'Communication, self-expression, and truth. The voice of our soul.', noiseType: 'white' },
    { id: 'third-eye', name: 'Third Eye Chakra (Ajna)', frequency: 426.7, description: 'Intuition, imagination, and wisdom. The center of our inner sight.', noiseType: 'white' },
    { id: 'crown', name: 'Crown Chakra (Sahasrara)', frequency: 480, description: 'Spiritual connection, enlightenment, and consciousness. Our gateway to the divine.', noiseType: 'white' },
    { id: 'soul-star', name: 'Soul Star Chakra', frequency: 512, description: 'Transpersonal connection, karmic patterns, and divine love. "The Seat of the Soul".', noiseType: 'white' },
    { id: 'spirit', name: 'Spirit Chakra', frequency: 544, description: 'Connects to higher realms, angelic guides, and the universal consciousness.', noiseType: 'white' },
    { id: 'universal', name: 'Universal Chakra', frequency: 576, description: 'Connection to cosmic consciousness, universal truths, and galactic energies.', noiseType: 'white' },
    { id: 'galactic', name: 'Galactic Chakra', frequency: 608, description: 'Access to higher-dimensional information, extraterrestrial consciousness, and star wisdom.', noiseType: 'white' },
    { id: 'divine-gateway', name: 'Divine Gateway Chakra', frequency: 640, description: 'The ultimate connection to the Source, divine oneness, and entry to other dimensions.', noiseType: 'white' },
];

const SCHUMANN_RESONANCE = 7.83; // Earth's "heartbeat" in Hz

const App: React.FC = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(30); // in minutes
    const [carrierVolume, setCarrierVolume] = useState(0.27);
    const [noiseVolume, setNoiseVolume] = useState(0.05);
    const [torusSpeed, setTorusSpeed] = useState(1.0);
    const [backgroundSpeed, setBackgroundSpeed] = useState(1.0);
    const [selectedPresetId, setSelectedPresetId] = useState('default');
    const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
    const [isAboutModalOpen, setAboutModalOpen] = useState(false);
    const [isSpiralModalOpen, setSpiralModalOpen] = useState(false);

    const soundEngineRef = useRef<SoundEngine | null>(null);
    const currentNoiseTypeRef = useRef<NoiseType | null>(null);
    
    const [status, setStatus] = useState<AppStatus>({
        elapsedTime: 0,
        phase: 'Standby',
        xCarrierFreq: 0,
        yCarrierFreq: 0,
        zBeatFreq: 0,
        xyModulation: 0,
    });
    
    // Instantiate SoundEngine on mount
    useEffect(() => {
        soundEngineRef.current = new SoundEngine();
    }, []);

    const selectedPreset = chakraPresets.find(p => p.id === selectedPresetId);
    
    // Main animation/status loop
    useAnimationFrame(isPlaying, (deltaTime) => {
        setStatus(prevStatus => {
            const newElapsedTime = prevStatus.elapsedTime + deltaTime;
            const sessionDuration = duration * 60;

            if (newElapsedTime >= sessionDuration) {
                setIsPlaying(false);
                return { ...prevStatus, elapsedTime: sessionDuration, phase: 'Complete' };
            }

            // Phase and noise logic based on total duration
            const oneThirdDuration = sessionDuration / 3;
            const twoThirdsDuration = sessionDuration * (2 / 3);
            
            let phase: AppStatus['phase'];
            let targetNoiseType: NoiseType;

            if (newElapsedTime < oneThirdDuration) {
                phase = 'Phase 1 (White)';
                targetNoiseType = 'white';
            } else if (newElapsedTime < twoThirdsDuration) {
                phase = 'Phase 2 (Pink)';
                targetNoiseType = 'pink';
            } else {
                phase = 'Phase 3 (Brown)';
                targetNoiseType = 'brown';
            }

            if (targetNoiseType !== currentNoiseTypeRef.current) {
                soundEngineRef.current?.setNoiseType(targetNoiseType);
                currentNoiseTypeRef.current = targetNoiseType;
            }

            const baseCarrierFreq = selectedPreset ? selectedPreset.frequency : 432;

            // Create a single oscillating value
            const oscillation = Math.sin(newElapsedTime * 0.1) * 5;

            // Calculate base frequencies for X and Y
            const baseXFreq = baseCarrierFreq - SCHUMANN_RESONANCE / 2;
            const baseYFreq = baseCarrierFreq + SCHUMANN_RESONANCE / 2;

            // Apply the oscillation in anti-phase
            const targetXFreq = baseXFreq + oscillation;
            const targetYFreq = baseYFreq - oscillation;
            
            soundEngineRef.current?.setFrequencies(targetXFreq, targetYFreq);

            // Get ACTUAL real-time frequencies from the audio engine for display
            const { x: actualXFreq, y: actualYFreq } = soundEngineRef.current?.getCurrentFrequencies() ?? { x: 0, y: 0 };
            
            // The Z-beat is now dynamic, reflecting the real difference.
            const zBeatFreq = actualYFreq - actualXFreq;
            
            // Add 7.83Hz modulation for visuals
            const xyModulation = Math.sin(newElapsedTime * Math.PI * 2 * SCHUMANN_RESONANCE);
            
            return {
                elapsedTime: newElapsedTime,
                phase,
                xCarrierFreq: actualXFreq,
                yCarrierFreq: actualYFreq,
                zBeatFreq,
                xyModulation,
            };
        });
    });

    const handlePlayPause = useCallback(() => {
        setIsPlaying(prev => !prev);
    }, []);

    const handlePresetChange = useCallback((presetId: string) => {
        setSelectedPresetId(presetId);
    }, []);

    // Effect to start/stop sound engine
    useEffect(() => {
        if (isPlaying) {
            currentNoiseTypeRef.current = null; // Reset to ensure initial noise is set
            soundEngineRef.current?.start().then(() => {
                setAnalyserNode(soundEngineRef.current?.analyserNode ?? null);
                // Set initial values
                soundEngineRef.current?.setCarrierVolume(carrierVolume);
                soundEngineRef.current?.setNoiseVolume(noiseVolume);
                setStatus({
                    elapsedTime: 0,
                    phase: 'Phase 1 (White)',
                    xCarrierFreq: 0,
                    yCarrierFreq: 0,
                    zBeatFreq: 0,
                    xyModulation: 0,
                });
            });
        } else {
            soundEngineRef.current?.stop();
             setStatus(prev => ({ ...prev, phase: prev.elapsedTime > 0 ? 'Complete' : 'Standby' }));
        }
    }, [isPlaying, carrierVolume, noiseVolume]);

    // Volume controllers
    useEffect(() => {
        soundEngineRef.current?.setCarrierVolume(carrierVolume);
    }, [carrierVolume]);

    useEffect(() => {
        soundEngineRef.current?.setNoiseVolume(noiseVolume);
    }, [noiseVolume]);

    return (
        <div className="bg-gray-900 text-white min-h-screen flex flex-col font-sans">
            <header className="grid grid-cols-3 items-center p-4 border-b border-gray-800">
                <div className="flex justify-start items-center gap-2">
                    <img src={logoSrc} alt="Spiral Studios Logo" className="w-10 h-10 sm:w-12 sm:h-12" />
                    <span className="text-sm sm:text-base font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                        Spiral Studios
                    </span>
                </div>
                
                <div className="text-center">
                    <h1 className="text-lg sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                        Quantum Soundscape
                    </h1>
                </div>

                <div className="flex justify-end items-center gap-2">
                     <button 
                        onClick={() => setSpiralModalOpen(true)}
                        className="px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-semibold text-gray-300 bg-gray-800/50 border border-gray-700 rounded-lg hover:bg-gray-700/70 transition-colors"
                    >
                        About Spiral Studios
                    </button>
                    <button 
                        onClick={() => setAboutModalOpen(true)}
                        className="px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-semibold text-gray-300 bg-gray-800/50 border border-gray-700 rounded-lg hover:bg-gray-700/70 transition-colors"
                    >
                        About The Science
                    </button>
                </div>
            </header>
            
            <main className="flex-grow flex flex-col p-4 gap-4">
                <div className="relative flex-grow rounded-lg overflow-hidden bg-gray-900 border border-gray-800 shadow-2xl shadow-black/50">
                    <Visualization 
                        isPlaying={isPlaying} 
                        analyserNode={analyserNode}
                        selectedPreset={selectedPreset}
                        status={status}
                        torusSpeed={torusSpeed}
                        backgroundSpeed={backgroundSpeed}
                    />
                </div>

                <div className="flex-shrink-0">
                    <StatusDisplay status={status} />
                </div>

                <div className="flex-shrink-0">
                    <ControlPanel
                        isPlaying={isPlaying}
                        onPlayPause={handlePlayPause}
                        duration={duration}
                        onDurationChange={setDuration}
                        carrierVolume={carrierVolume}
                        onCarrierVolumeChange={setCarrierVolume}
                        noiseVolume={noiseVolume}
                        onNoiseVolumeChange={setNoiseVolume}
                        torusSpeed={torusSpeed}
                        onTorusSpeedChange={setTorusSpeed}
                        backgroundSpeed={backgroundSpeed}
                        onBackgroundSpeedChange={setBackgroundSpeed}
                        presets={chakraPresets}
                        selectedPresetId={selectedPresetId}
                        onPresetChange={handlePresetChange}
                        selectedPresetDescription={selectedPreset?.description}
                    />
                </div>
            </main>
            
            <AboutModal isOpen={isAboutModalOpen} onClose={() => setAboutModalOpen(false)} />
            <SpiralStudiosModal isOpen={isSpiralModalOpen} onClose={() => setSpiralModalOpen(false)} />
        </div>
    );
};

export default App;