/**
 * Create Regimen Page
 * Allows users to create and share regimens with the community
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { 
  ArrowLeft, 
  Plus, 
  X, 
  Save,
  Globe,
  Lock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { createRegimen } from '../lib/utils/regimens';
import { Regimen, RegimenStep } from '../lib/types/regimens';

export const CreateRegimen = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<RegimenStep[]>([
    { id: '1', order: 1, title: '', description: '' }
  ]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [hairType, setHairType] = useState<Regimen['hairType']>();
  const [porosity, setPorosity] = useState<Regimen['porosity']>();
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);

  const addStep = () => {
    const newStep: RegimenStep = {
      id: Date.now().toString(),
      order: steps.length + 1,
      title: '',
      description: '',
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (stepId: string) => {
    const filtered = steps.filter(s => s.id !== stepId);
    // Reorder steps
    const reordered = filtered.map((step, index) => ({
      ...step,
      order: index + 1,
    }));
    setSteps(reordered);
  };

  const updateStep = (stepId: string, updates: Partial<RegimenStep>) => {
    setSteps(steps.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to create regimens.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your regimen.",
        variant: "destructive",
      });
      return;
    }

    if (steps.length === 0 || steps.some(s => !s.title.trim())) {
      toast({
        title: "Steps required",
        description: "Please add at least one step with a title.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const regimenId = await createRegimen(
        currentUser.uid,
        currentUser.displayName || currentUser.email || 'Anonymous',
        currentUser.photoURL || undefined,
        {
          title: title.trim(),
          description: description.trim() || undefined,
          steps,
          tags,
          hairType,
          porosity,
          isPublic,
        }
      );

      toast({
        title: "Regimen created!",
        description: isPublic 
          ? "Your regimen has been shared with the community."
          : "Your regimen has been saved.",
      });

      navigate(`/community/regimen/${regimenId}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create regimen.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/community')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Community
            </Button>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Share Your Regimen
            </h1>
            <p className="text-muted-foreground">
              Create and share your hair care routine with the community
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Basic Info */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., My Curly Hair Routine"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tell the community about your regimen..."
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
              </Card>

              {/* Hair Type & Porosity */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Hair Profile</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hairType">Hair Type</Label>
                    <select
                      id="hairType"
                      value={hairType || ''}
                      onChange={(e) => setHairType(e.target.value as Regimen['hairType'])}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select...</option>
                      <option value="straight">Straight</option>
                      <option value="wavy">Wavy</option>
                      <option value="curly">Curly</option>
                      <option value="coily">Coily</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="porosity">Porosity</Label>
                    <select
                      id="porosity"
                      value={porosity || ''}
                      onChange={(e) => setPorosity(e.target.value as Regimen['porosity'])}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select...</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
              </Card>

              {/* Steps */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Steps *</h2>
                  <Button type="button" variant="outline" size="sm" onClick={addStep}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Step
                  </Button>
                </div>
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <div key={step.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          Step {step.order}
                        </span>
                        {steps.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeStep(step.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div>
                        <Label>Step Title *</Label>
                        <Input
                          value={step.title}
                          onChange={(e) => updateStep(step.id, { title: e.target.value })}
                          placeholder="e.g., Shampoo with clarifying shampoo"
                          required
                        />
                      </div>
                      <div>
                        <Label>Step Description</Label>
                        <Textarea
                          value={step.description}
                          onChange={(e) => updateStep(step.id, { description: e.target.value })}
                          placeholder="Describe what to do in this step..."
                          className="min-h-[80px]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Tags */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Tags</h2>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      placeholder="Add a tag (e.g., curly, deep-conditioning)"
                    />
                    <Button type="button" onClick={addTag}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              {/* Privacy */}
              <Card className="p-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isPublic"
                    checked={isPublic}
                    onCheckedChange={(checked) => setIsPublic(checked === true)}
                  />
                  <div className="flex-1">
                    <Label htmlFor="isPublic" className="flex items-center gap-2 cursor-pointer">
                      {isPublic ? (
                        <>
                          <Globe className="w-4 h-4" />
                          Share with community (Public)
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          Keep private (Only you can see)
                        </>
                      )}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isPublic 
                        ? "Your regimen will be visible to everyone in the community"
                        : "Your regimen will only be visible to you"}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Submit */}
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/community')}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Creating...' : isPublic ? 'Share with Community' : 'Save Regimen'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

