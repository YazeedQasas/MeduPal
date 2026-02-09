import React, { useState } from 'react';
import {
    User,
    Bell,
    Shield,
    Globe,
    Database,
    Cpu,
    Moon,
    Sun,
    Save,
    RotateCcw,
    Mail,
    Lock,
    Eye,
    Monitor,
    Cloud
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function Settings() {
    const [activeSection, setActiveSection] = useState('profile');

    const sections = [
        { id: 'profile', label: 'Profile Settings', icon: User, description: 'Manage your account information and preferences.' },
        { id: 'security', label: 'Security & Privacy', icon: Shield, description: 'Update your password and secure your account.' },
        { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Choose how you receive system alerts and updates.' },
        { id: 'system', label: 'System Configuration', icon: Cpu, description: 'Advanced manikin and ESP32 network parameters.' },
        { id: 'database', label: 'Database & Sync', icon: Database, description: 'Manage historical session data and cloud backups.' }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                    <p className="text-muted-foreground mt-1">Configure your MeduPal experience and system preferences.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-lg font-medium transition-colors border border-border text-sm">
                        <RotateCcw size={16} />
                        Reset Defaults
                    </button>
                    <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 text-sm">
                        <Save size={16} />
                        Save Changes
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar Navigation */}
                <div className="lg:col-span-1 space-y-1">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                                activeSection === section.id
                                    ? "bg-primary/10 text-primary shadow-sm"
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                        >
                            <section.icon size={18} className={cn(
                                "transition-transform group-hover:scale-110",
                                activeSection === section.id ? "text-primary" : "text-muted-foreground"
                            )} />
                            {section.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="lg:col-span-3">
                    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                        {activeSection === 'profile' && (
                            <div className="p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h3 className="text-xl font-bold text-foreground">Profile Information</h3>
                                    <p className="text-sm text-muted-foreground mt-1">This information will be displayed to other faculty members.</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex flex-col md:flex-row gap-6 items-center">
                                        <div className="relative group">
                                            <div className="w-24 h-24 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-2xl font-bold border-2 border-indigo-500/20">
                                                AD
                                            </div>
                                            <button className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground p-2 rounded-lg shadow-lg hover:scale-110 transition-transform">
                                                <RotateCcw size={14} />
                                            </button>
                                        </div>
                                        <div className="flex-1 space-y-4 w-full">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Full Name</label>
                                                    <div className="relative">
                                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                                        <input className="w-full bg-muted/30 border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all" defaultValue="Admin User" />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Address</label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                                        <input className="w-full bg-muted/30 border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all" defaultValue="admin@medupal.com" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bio & Specialization</label>
                                        <textarea
                                            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all h-32 resize-none"
                                            placeholder="Tell us about yourself..."
                                            defaultValue="Head of Medical Simulation at University Health Science Center. Specialized in Emergency Medicine and OSCE orchestration."
                                        />
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                            <Globe size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground">Language & Region</p>
                                            <p className="text-xs text-muted-foreground">English (United States) — UTC-05:00</p>
                                        </div>
                                    </div>
                                    <button className="text-primary text-sm font-semibold hover:underline">Change Preferences</button>
                                </div>
                            </div>
                        )}

                        {/* Generic placeholder for other sections to keep the demo clean */}
                        {activeSection !== 'profile' && (
                            <div className="p-12 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="w-16 h-16 rounded-2xl bg-primary/5 text-primary flex items-center justify-center mb-2">
                                    {React.createElement(sections.find(s => s.id === activeSection)?.icon || Settings2, { size: 32 })}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-foreground capitalize">{activeSection} Settings</h3>
                                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                        {sections.find(s => s.id === activeSection)?.description}
                                    </p>
                                </div>
                                <div className="pt-4 grid grid-cols-1 gap-4 w-full max-w-sm">
                                    <div className="h-10 bg-muted/30 rounded-xl border border-border border-dashed" />
                                    <div className="h-10 bg-muted/30 rounded-xl border border-border border-dashed w-2/3 mx-auto" />
                                </div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest pt-4">Configuration pending</p>
                            </div>
                        )}
                    </div>

                    {/* Quick Toggles */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                                    <Monitor size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-foreground">Dark Mode</p>
                                    <p className="text-xs text-muted-foreground">Adjust system appearance</p>
                                </div>
                            </div>
                            <button className="w-12 h-6 rounded-full bg-primary relative transition-colors">
                                <span className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white shadow-sm" />
                            </button>
                        </div>
                        <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                    <Cloud size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-foreground">Auto-Sync</p>
                                    <p className="text-xs text-muted-foreground">Save to cloud every 5 mins</p>
                                </div>
                            </div>
                            <button className="w-12 h-6 rounded-full bg-muted relative transition-colors">
                                <span className="absolute left-1 top-1 w-4 h-4 rounded-full bg-white shadow-sm" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
