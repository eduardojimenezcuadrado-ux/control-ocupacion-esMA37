import React from 'react';
import {
    BarChart3,
    Calendar,
    Users,
    Briefcase,
    Clock,
    Settings as SettingsIcon,
    Menu,
    X,
    LayoutDashboard
} from 'lucide-react';

interface SidebarProps {
    currentScreen: string;
    onScreenChange: (screen: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentScreen, onScreenChange }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    const menuItems = [
        { id: 'inicio', label: 'Inicio', icon: LayoutDashboard },
        { id: 'planificacion', label: 'Planificación', icon: Calendar },
        { id: 'consultores', label: 'Consultores', icon: Users },
        { id: 'proyectos', label: 'Proyectos', icon: Briefcase },
        { id: 'ausencias', label: 'Ausencias', icon: Clock },
        { id: 'ajustes', label: 'Ajustes', icon: SettingsIcon },
    ];

    const handleNav = (id: string) => {
        onScreenChange(id);
        setIsOpen(false);
    };

    return (
        <>
            {/* Mobile Toggle */}
            <div className="lg:hidden fixed top-6 left-6 z-50">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-3 bg-[#252729] text-white rounded-xl shadow-2xl border border-gray-700 active:scale-95 transition-transform"
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Sidebar background overlay with blur */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 lg:hidden transition-opacity duration-300"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Content */}
            <aside className={`
                sidebar fixed inset-y-0 left-0 z-40 transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
                lg:relative lg:translate-x-0
            `}>
                <div className="flex items-center gap-4 px-2 mb-12">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#f78c38] to-[#ea580c] rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <BarChart3 className="text-white" size={24} />
                    </div>
                    <div>
                        <span className="text-2xl font-black tracking-tighter text-white block">ESMA37</span>
                        <span className="text-[11px] uppercase tracking-[0.25em] font-black text-gray-500">Control de Ocupación</span>
                    </div>
                </div>

                <nav className="flex-1 space-y-1">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleNav(item.id)}
                            className={`nav-item w-full py-4 px-6 group ${currentScreen === item.id ? 'active' : ''}`}
                        >
                            <item.icon size={22} className={`transition-transform duration-300 ${currentScreen === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                            <span className="font-bold text-base tracking-tight">{item.label}</span>
                            {currentScreen === item.id && (
                                <div className="ml-auto w-2 h-2 rounded-full bg-white/40 shadow-[0_0_8px_white]" />
                            )}
                        </button>
                    ))}
                </nav>

                <div className="mt-auto">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 mb-6 hover:bg-white/10 transition-colors cursor-default">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Sistema Activo</span>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                            Seguimiento de ocupación en tiempo real para Q1-2026.
                        </p>
                    </div>

                    <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest text-center opacity-50 hover:opacity-100 transition-opacity">
                        &copy; 2026 Consulting Team
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
