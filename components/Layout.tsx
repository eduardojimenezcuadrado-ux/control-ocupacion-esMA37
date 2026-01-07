import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Dashboard from '../screens/Dashboard';
import Planning from '../screens/Planning';
import Consultants from '../screens/Consultants';
import Projects from '../screens/Projects';
import Absences from '../screens/Absences';
import SettingsScreen from '../screens/Settings';

const Layout: React.FC = () => {
    const [currentScreen, setCurrentScreen] = useState('inicio');

    const renderScreen = () => {
        switch (currentScreen) {
            case 'inicio': return <Dashboard />;
            case 'planificacion': return <Planning />;
            case 'consultores': return <Consultants />;
            case 'proyectos': return <Projects />;
            case 'ausencias': return <Absences />;
            case 'ajustes': return <SettingsScreen />;
            default: return <Dashboard />;
        }
    };

    return (
        <div className="app-container">
            <Sidebar
                currentScreen={currentScreen}
                onScreenChange={setCurrentScreen}
            />
            <main className="main-content">
                {renderScreen()}
            </main>
        </div>
    );
};

export default Layout;
