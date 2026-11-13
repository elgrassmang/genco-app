import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Trash2, Plus, StickyNote, Tag } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const StaffNotes = ({ customerId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [category, setCategory] = useState('General');
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const fetchNotes = async () => {
       if (!customerId) return;
       const docRef = doc(db, 'users', customerId);
       const snap = await getDoc(docRef);
       if (snap.exists() && snap.data().staffNotes) {
          // Sort reverse chronological
          const sorted = [...snap.data().staffNotes].sort((a,b) => 
             new Date(b.timestamp) - new Date(a.timestamp)
          );
          setNotes(sorted);
       }
    };
    fetchNotes();
  }, [customerId]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setLoading(true);

    const noteObj = {
       id: Date.now().toString(),
       content: newNote,
       category,
       addedBy: user.email,
       timestamp: new Date().toISOString()
    };

    try {
       const docRef = doc(db, 'users', customerId);
       await updateDoc(docRef, {
          staffNotes: arrayUnion(noteObj)
       });
       
       setNotes(prev => [noteObj, ...prev]);
       setNewNote('');
       setCategory('General');
       setIsAdding(false);
       toast({ title: "Note Added", description: "Staff note saved successfully." });
    } catch (err) {
       console.error(err);
       toast({ title: "Error", description: "Failed to save note.", variant: "destructive" });
    } finally {
       setLoading(false);
    }
  };

  const handleDelete = async (noteToDelete) => {
    if (!window.confirm("Delete this note?")) return;
    try {
       const docRef = doc(db, 'users', customerId);
       await updateDoc(docRef, {
          staffNotes: arrayRemove(noteToDelete)
       });
       setNotes(prev => prev.filter(n => n.id !== noteToDelete.id));
       toast({ title: "Note Deleted" });
    } catch (err) {
       toast({ title: "Error", description: "Failed to delete note.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-[hsl(var(--brand-cream))]">Internal Staff Notes</h3>
          <Button size="sm" onClick={() => setIsAdding(!isAdding)} variant={isAdding ? "secondary" : "default"}>
             {isAdding ? "Cancel" : <><Plus className="w-4 h-4 mr-2" /> Add Note</>}
          </Button>
       </div>

       {isAdding && (
          <Card className="bg-[hsl(var(--brand-dark-mode-bg))]/50 border-blue-500/30">
             <CardContent className="p-4 space-y-4">
                <div className="flex gap-4">
                   <div className="w-1/3">
                      <Select value={category} onValueChange={setCategory}>
                         <SelectTrigger><SelectValue /></SelectTrigger>
                         <SelectContent>
                            <SelectItem value="General">General</SelectItem>
                            <SelectItem value="Gate Code">Gate Code</SelectItem>
                            <SelectItem value="Pet Warning">Pet Warning</SelectItem>
                            <SelectItem value="Special Request">Special Request</SelectItem>
                            <SelectItem value="Complaint">Complaint</SelectItem>
                         </SelectContent>
                      </Select>
                   </div>
                   <div className="flex-grow">
                      <Textarea 
                         placeholder="Type note details here..." 
                         value={newNote}
                         onChange={(e) => setNewNote(e.target.value)}
                         className="bg-black/20 min-h-[100px]"
                      />
                   </div>
                </div>
                <div className="flex justify-end">
                   <Button onClick={handleAddNote} disabled={loading} className="bg-blue-600 text-white">
                      Save Note
                   </Button>
                </div>
             </CardContent>
          </Card>
       )}

       <div className="space-y-3">
          {notes.length === 0 && !isAdding && (
             <p className="text-center text-muted-foreground py-8">No notes yet.</p>
          )}
          
          {notes.map(note => (
             <Card key={note.id} className="bg-[hsl(var(--brand-dark))] border-[hsl(var(--brand-deep-red))]/20 hover:border-[hsl(var(--brand-deep-red))]/40 transition-colors">
                <CardContent className="p-4 relative group">
                   <Button 
                     size="icon" 
                     variant="ghost" 
                     className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 h-8 w-8"
                     onClick={() => handleDelete(note)}
                   >
                      <Trash2 className="w-4 h-4" />
                   </Button>

                   <div className="flex items-start gap-3">
                      <div className={`mt-1 p-2 rounded-full shrink-0 ${
                         note.category === 'Gate Code' ? 'bg-purple-900/50 text-purple-300' :
                         note.category === 'Pet Warning' ? 'bg-red-900/50 text-red-300' :
                         note.category === 'Special Request' ? 'bg-amber-900/50 text-amber-300' :
                         'bg-blue-900/50 text-blue-300'
                      }`}>
                         <StickyNote className="w-4 h-4" />
                      </div>
                      <div>
                         <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center gap-1">
                               <Tag className="w-3 h-3" /> {note.category}
                            </span>
                            <span className="text-[10px] text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                               {format(new Date(note.timestamp), 'MMM d, yyyy h:mm a')}
                            </span>
                            <span className="text-[10px] text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground italic">by {note.addedBy}</span>
                         </div>
                         <p className="text-sm text-[hsl(var(--brand-cream))] whitespace-pre-wrap">{note.content}</p>
                      </div>
                   </div>
                </CardContent>
             </Card>
          ))}
       </div>
    </div>
  );
};

export default StaffNotes;