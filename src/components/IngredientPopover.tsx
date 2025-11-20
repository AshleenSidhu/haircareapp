/**
 * Ingredient Popover Component
 * Displays ingredient science data in a popover when clicking on an ingredient
 */

import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ExternalLink, Loader2, Info } from 'lucide-react';
import { useIngredientCache } from '../hooks/useIngredientCache';
import { ApiIngredient } from '../lib/types/api';

interface IngredientPopoverProps {
  inciName: string;
  children: React.ReactNode;
}

export function IngredientPopover({ inciName, children }: IngredientPopoverProps) {
  const [open, setOpen] = useState(false);
  const [ingredient, setIngredient] = useState<ApiIngredient | null>(null);
  const [loading, setLoading] = useState(false);
  const { fetchIngredient } = useIngredientCache();

  useEffect(() => {
    if (open && inciName) {
      setLoading(true);
      fetchIngredient(inciName)
        .then((data) => {
          setIngredient(data);
        })
        .catch((error) => {
          console.error('Error fetching ingredient:', error);
          setIngredient(null);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, inciName, fetchIngredient]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : ingredient ? (
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-sm mb-1">{ingredient.inci_name}</h4>
              {ingredient.cas_number && (
                <p className="text-xs text-muted-foreground">CAS: {ingredient.cas_number}</p>
              )}
            </div>

            {ingredient.functions && ingredient.functions.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">Functions:</p>
                <div className="flex flex-wrap gap-1">
                  {ingredient.functions.map((func, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {func}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {ingredient.tags && ingredient.tags.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">Tags:</p>
                <div className="flex flex-wrap gap-1">
                  {ingredient.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant={
                        tag === 'harsh' || tag === 'irritant'
                          ? 'destructive'
                          : tag === 'safe' || tag === 'hydration'
                          ? 'default'
                          : 'outline'
                      }
                      className="text-xs"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {ingredient.safety_notes && (
              <div>
                <p className="text-xs font-medium mb-1">Safety Notes:</p>
                <p className="text-xs text-muted-foreground">{ingredient.safety_notes}</p>
              </div>
            )}

            {ingredient.restrictions && ingredient.restrictions !== 'None' && (
              <div>
                <p className="text-xs font-medium mb-1">Restrictions:</p>
                <p className="text-xs text-muted-foreground">{ingredient.restrictions}</p>
              </div>
            )}

            {ingredient.source_url && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(ingredient.source_url, '_blank')}
              >
                <ExternalLink className="w-3 h-3 mr-2" />
                View on CosIng
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Info className="w-4 h-4" />
            <span>No ingredient data available</span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

