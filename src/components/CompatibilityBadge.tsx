/**
 * Compatibility Badge Component
 * Displays compatibility score with color coding and explainers
 */

import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { ProductProfile, UserProfile } from '../lib/types/api';

interface CompatibilityBadgeProps {
  score: number;
  explainers?: string[];
  productProfile?: ProductProfile;
  userProfile?: UserProfile;
}

export function CompatibilityBadge({
  score,
  explainers = [],
  productProfile,
  userProfile,
}: CompatibilityBadgeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreVariant = (score: number): 'default' | 'secondary' | 'destructive' => {
    if (score >= 75) return 'default';
    if (score >= 50) return 'secondary';
    return 'destructive';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 75) return <CheckCircle2 className="w-4 h-4" />;
    if (score >= 50) return <AlertCircle className="w-4 h-4" />;
    return <XCircle className="w-4 h-4" />;
  };

  // Generate explainable summary
  const generateSummary = (): string => {
    if (!productProfile || !userProfile) {
      return `Score: ${score}/100`;
    }

    const parts: string[] = [];
    const { moisture_score, protein_score, oil_level, irritant_risk } = productProfile;
    const { porosity, hairType, scalpSensitive } = userProfile;

    // Porosity-specific recommendations
    if (porosity === 'low' && oil_level > 50) {
      parts.push('may weigh down low-porosity hair');
    } else if (porosity === 'high' && moisture_score < 50) {
      parts.push('may not provide enough moisture for high-porosity hair');
    }

    // Scalp sensitivity
    if (scalpSensitive && irritant_risk > 30) {
      parts.push('contains potential irritants');
    }

    // Positive aspects
    if (moisture_score > 70) {
      parts.push('good for dry hair');
    }
    if (protein_score > 50) {
      parts.push('contains protein (avoid if protein-sensitive)');
    }

    const summary = parts.length > 0 ? parts.join('; ') : 'moderate compatibility';
    return `Score: ${score}/100 — ${summary}`;
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <Badge variant={getScoreVariant(score)} className="text-sm">
          {getScoreIcon(score)}
          <span className="ml-2 font-semibold">{score}/100</span>
        </Badge>
        <span className={`text-sm font-medium ${getScoreColor(score)}`}>
          Compatibility Score
        </span>
      </div>

      <p className="text-sm text-muted-foreground mb-3">{generateSummary()}</p>

      {explainers && explainers.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium mb-2">Key Points:</p>
          <ul className="space-y-1">
            {explainers.slice(0, 3).map((explainer, index) => (
              <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>{explainer}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

