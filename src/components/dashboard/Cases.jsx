import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, FileText, Clock, Users, ChevronRight, Star, Tag, Activity, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { CreateCaseForm } from './CreateCaseForm';

export function Cases() {
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All Categories');
    const [difficultyFilter, setDifficultyFilter] = useState('Any Difficulty');
    const [cases, setCases] = useState([]);
    const [isCreating, setIsCreating] = useState(false);

    const fetchCases = async () => {
        const { data, error } = await supabase
            .from('cases')
            .select(`
                *,
                author:profiles(full_name)
            `)
            .order('created_at', { ascending: false });

        if (data) {
            const formatted = data.map(c => ({
                id: c.id,
                title: c.title,
                category: c.category || 'General',
                difficulty: c.difficulty,
                duration: `${c.duration_minutes} mins`,
                lastModified: new Date(c.created_at).toLocaleDateString(),
                status: c.status,
                author: c.author?.full_name || 'Unknown',
                rating: c.rating
            }));
            setCases(formatted);
        }
    };

    useEffect(() => {
        fetchCases();
    }, []);

    const handleDelete = async (id, e) => {
        e.stopPropagation(); // Prevent card click
        if (window.confirm('Are you sure you want to delete this case?')) {
            const { error } = await supabase.from('cases').delete().eq('id', id);
            if (!error) {
                fetchCases();
            } else {
                console.error('Delete error:', error);
                alert(`Error deleting case: ${error.message}`);
            }
        }
    };

    const filteredCases = cases.filter(c => {
        const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.author.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'All Categories' || c.category === categoryFilter;
        const matchesDifficulty = difficultyFilter === 'Any Difficulty' || c.difficulty === difficultyFilter;
        return matchesSearch && matchesCategory && matchesDifficulty;
    });

    return (
        <div className="space-y-6 relative">
            {isCreating && (
                <CreateCaseForm
                    onClose={() => setIsCreating(false)}
                    onCreated={fetchCases}
                />
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Cases Library</h1>
                    <p className="text-muted-foreground mt-1">Manage and create clinical simulation scenarios.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                >
                    <Plus size={18} />
                    Create New Case
                </button>
            </div>

            {/* Filters and Search */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                        type="text"
                        placeholder="Search cases by title, author or category..."
                        className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <select
                        className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        <option>All Categories</option>
                        <option>Cardiology</option>
                        <option>Respiratory</option>
                        <option>Trauma</option>
                        <option>Neurology</option>
                        <option>Pediatrics</option>
                    </select>
                </div>
                <div className="relative">
                    <Star className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <select
                        className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer"
                        value={difficultyFilter}
                        onChange={(e) => setDifficultyFilter(e.target.value)}
                    >
                        <option>Any Difficulty</option>
                        <option>Easy</option>
                        <option>Intermediate</option>
                        <option>Hard</option>
                    </select>
                </div>
            </div>

            {/* Cases Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredCases.map((caseItem) => (
                    <div key={caseItem.id} className="group bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 relative overflow-hidden">
                        {/* Status Badge */}
                        <div className="absolute top-0 right-0 p-3 flex gap-2">
                            <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full",
                                caseItem.status === 'Published' ? "bg-green-500/10 text-green-500" :
                                    caseItem.status === 'Draft' ? "bg-amber-500/10 text-amber-500" :
                                        "bg-muted text-muted-foreground"
                            )}>
                                {caseItem.status}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2 pr-16">
                                <div className="flex items-center gap-2 text-primary font-medium text-xs">
                                    <Tag size={12} />
                                    {caseItem.category}
                                </div>
                                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                    {caseItem.title}
                                </h3>
                            </div>

                            <div className="grid grid-cols-2 gap-y-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                                    <Clock size={14} className="text-muted-foreground/60" />
                                    {caseItem.duration}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                                    <Activity size={14} className="text-muted-foreground/60" />
                                    {caseItem.difficulty}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                                    <Users size={14} className="text-muted-foreground/60" />
                                    {caseItem.author}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                                    <Star size={14} className="text-yellow-500/80 fill-yellow-500/20" />
                                    {caseItem.rating}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                    Last edit: {caseItem.lastModified}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => handleDelete(caseItem.id, e)}
                                        className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                                        title="Delete Case"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <button className="text-primary hover:text-primary/80 flex items-center gap-1 text-sm font-semibold transition-all group-hover:translate-x-1">
                                        Details
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
