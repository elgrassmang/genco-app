import React, { useState, useEffect } from 'react';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
    import { Button } from '@/components/ui/button';
    import { Textarea } from '@/components/ui/textarea';
    import { CheckCircle, XCircle, Edit3, MapPin, User, Info, MessageSquare } from 'lucide-react';
    import AssignmentStatusBadge from '@/components/worker/AssignmentStatusBadge';
    import { motion } from 'framer-motion';

    const AssignmentCard = ({ assignment, onUpdate }) => {
      const [currentNotes, setCurrentNotes] = useState(assignment.notes || '');
      const [isEditingNotes, setIsEditingNotes] = useState(false);
      const [charCount, setCharCount] = useState((assignment.notes || '').length);
      const MAX_NOTES_LENGTH = 250;

      useEffect(() => {
        setCurrentNotes(assignment.notes || '');
        setCharCount((assignment.notes || '').length);
      }, [assignment.notes]);

      const handleNotesChange = (e) => {
        const newNotes = e.target.value;
        if (newNotes.length <= MAX_NOTES_LENGTH) {
          setCurrentNotes(newNotes);
          setCharCount(newNotes.length);
        }
      };

      const handleSaveNotes = () => {
        onUpdate(assignment.id, assignment.status, currentNotes);
        setIsEditingNotes(false);
      };

      const handleStatusUpdate = (newStatus) => {
        let notesToUpdate = currentNotes;
        if (newStatus === 'completed' && !notesToUpdate.toLowerCase().includes('completed') && !notesToUpdate.toLowerCase().includes('picked up')) {
          notesToUpdate = `Picked up at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. ${notesToUpdate}`.trim();
        } else if (newStatus === 'skipped' && !notesToUpdate.toLowerCase().includes('skipped')) {
           notesToUpdate = `Skipped. ${notesToUpdate}`.trim();
        }
        
        if (notesToUpdate.length > MAX_NOTES_LENGTH) {
            notesToUpdate = notesToUpdate.substring(0, MAX_NOTES_LENGTH);
        }
        setCurrentNotes(notesToUpdate);
        onUpdate(assignment.id, newStatus, notesToUpdate);
        setIsEditingNotes(false); 
      };
      
      const customerName = assignment.customer?.fullname || assignment.customer?.email?.split('@')[0] || 'N/A';
      const customerAddress = assignment.customer?.serviceaddress || 'Address not available';
      const customerNotes = assignment.customer?.notes;

      return (
        <motion.div
          layout
          initial={{ opacity: 0.8, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
        >
          <Card className={`shadow-lg hover:shadow-xl transition-shadow duration-300 border-l-4 ${
            assignment.status === 'completed' ? 'border-green-500 bg-green-500/5' :
            assignment.status === 'skipped' ? 'border-red-500 bg-red-500/5' :
            'border-yellow-500 bg-yellow-500/5'
          } glassmorphism`}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl font-semibold text-primary flex items-center">
                    <User className="w-5 h-5 mr-2 text-primary/80" /> {customerName}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground flex items-center mt-1">
                    <MapPin className="w-4 h-4 mr-2 text-muted-foreground/80" /> {customerAddress}
                  </CardDescription>
                </div>
                <AssignmentStatusBadge status={assignment.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {customerNotes && (
                <div className="p-2.5 bg-primary/10 rounded-md border border-primary/20">
                  <p className="text-xs font-medium text-primary flex items-center">
                    <Info className="w-3.5 h-3.5 mr-1.5 shrink-0" /> Customer Instructions:
                  </p>
                  <p className="text-sm text-foreground/90 pl-1 mt-0.5">{customerNotes}</p>
                </div>
              )}
              
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor={`notes-${assignment.id}`} className="text-sm font-medium text-foreground/90 flex items-center">
                    <MessageSquare className="w-4 h-4 mr-1.5 text-primary/80" /> Service Notes:
                  </label>
                  {!isEditingNotes && assignment.status !== 'completed' && assignment.status !== 'skipped' && (
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(true)} className="text-xs h-7 px-2 py-1 text-primary hover:bg-primary/10">
                      <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                  )}
                </div>
                {isEditingNotes ? (
                  <div className="space-y-2">
                    <Textarea
                      id={`notes-${assignment.id}`}
                      value={currentNotes}
                      onChange={handleNotesChange}
                      placeholder="Add notes (e.g., gate code, issues)"
                      className="text-sm min-h-[60px] bg-background/70 border-primary/30 focus:border-primary"
                      maxLength={MAX_NOTES_LENGTH}
                    />
                    <div className="flex justify-between items-center text-xs">
                        <p className={`text-muted-foreground ${charCount > MAX_NOTES_LENGTH - 20 ? 'text-destructive' : ''}`}>
                            {charCount}/{MAX_NOTES_LENGTH}
                        </p>
                        <div>
                            <Button variant="ghost" size="sm" onClick={() => { setIsEditingNotes(false); setCurrentNotes(assignment.notes || ''); }} className="text-xs h-7 px-2 py-1 mr-1 text-muted-foreground hover:bg-muted/20">Cancel</Button>
                            <Button size="sm" onClick={handleSaveNotes} className="text-xs h-7 px-2 py-1 bg-primary hover:bg-primary/90">Save Notes</Button>
                        </div>
                    </div>
                  </div>
                ) : (
                  <p className={`text-sm min-h-[24px] text-foreground/80 ${!currentNotes ? 'italic text-muted-foreground/70' : ''}`}>
                    {currentNotes || (assignment.status === 'pending' ? 'No notes yet.' : 'Notes saved.')}
                  </p>
                )}
              </div>
            </CardContent>
            {assignment.status === 'pending' && (
              <CardFooter className="flex justify-end gap-2 pt-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleStatusUpdate('skipped')}
                  className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <XCircle className="w-4 h-4 mr-1.5" /> Skip
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => handleStatusUpdate('completed')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" /> Mark Complete
                </Button>
              </CardFooter>
            )}
          </Card>
        </motion.div>
      );
    };

    export default AssignmentCard;