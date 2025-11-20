/**
 * Save Regimen Modal
 * Allows users to save a regimen to their personal collection or create a new one
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { saveRegimen } from '../lib/utils/regimens';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Regimen } from '../lib/types/regimens';

interface SaveRegimenModalProps {
  regimenId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export const SaveRegimenModal: React.FC<SaveRegimenModalProps> = ({
  regimenId,
  open,
  onOpenChange,
  onSave,
}) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [saveOption, setSaveOption] = useState<'new' | 'existing'>('new');
  const [userRegimens, setUserRegimens] = useState<Regimen[]>([]);
  const [selectedRegimenId, setSelectedRegimenId] = useState<string>('');
  const [newRegimenName, setNewRegimenName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && currentUser) {
      loadUserRegimens();
    }
  }, [open, currentUser]);

  const loadUserRegimens = async () => {
    if (!currentUser) return;
    
    try {
      const q = query(
        collection(db, 'regimens'),
        where('authorId', '==', currentUser.uid),
        where('isDraft', '==', false)
      );
      const snapshot = await getDocs(q);
      const regimens = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Regimen[];
      setUserRegimens(regimens);
    } catch (error) {
      console.error('Error loading user regimens:', error);
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      if (saveOption === 'new') {
        if (!newRegimenName.trim()) {
          toast({
            title: "Name required",
            description: "Please enter a name for your new regimen.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        // TODO: Create new regimen and save to it
        // For now, just save the regimen
        await saveRegimen(regimenId, currentUser.uid);
      } else {
        if (!selectedRegimenId) {
          toast({
            title: "Selection required",
            description: "Please select a regimen to save to.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        await saveRegimen(regimenId, currentUser.uid, selectedRegimenId);
      }
      
      toast({
        title: "Regimen saved",
        description: "The regimen has been added to your collection.",
      });
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save regimen.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Regimen</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <RadioGroup value={saveOption} onValueChange={(value) => setSaveOption(value as 'new' | 'existing')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="new" id="new" />
              <Label htmlFor="new">Create new personal regimen</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="existing" id="existing" />
              <Label htmlFor="existing">Add to existing regimen</Label>
            </div>
          </RadioGroup>

          {saveOption === 'new' && (
            <div className="space-y-2">
              <Label htmlFor="regimenName">Regimen Name</Label>
              <Input
                id="regimenName"
                placeholder="My Hair Care Routine"
                value={newRegimenName}
                onChange={(e) => setNewRegimenName(e.target.value)}
              />
            </div>
          )}

          {saveOption === 'existing' && (
            <div className="space-y-2">
              <Label>Select Regimen</Label>
              {userRegimens.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You don't have any personal regimens yet. Create a new one instead.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {userRegimens.map((regimen) => (
                    <button
                      key={regimen.id}
                      onClick={() => setSelectedRegimenId(regimen.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedRegimenId === regimen.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      <p className="font-medium">{regimen.title}</p>
                      {regimen.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {regimen.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

