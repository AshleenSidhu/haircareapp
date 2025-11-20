/**
 * Eco Score Badge Component
 * Displays the eco score with grade, reasoning, and recommendations
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  Leaf, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  XCircle, 
  Lightbulb,
  Info
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

interface EcoScoreBadgeProps {
  ecoScore?: number;
  ecoGrade?: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  ecoReasoning?: string[];
  ecoPositiveFactors?: string[];
  ecoNegativeFactors?: string[];
  ecoRecommendations?: string[];
  className?: string;
}

export const EcoScoreBadge: React.FC<EcoScoreBadgeProps> = ({
  ecoScore,
  ecoGrade,
  ecoReasoning,
  ecoPositiveFactors,
  ecoNegativeFactors,
  ecoRecommendations,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate basic eco score on frontend if missing
  const calculateBasicEcoScore = (): { score: number; grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F'; isEstimated: boolean } => {
    if (ecoScore !== undefined && ecoGrade) {
      return { score: ecoScore, grade: ecoGrade, isEstimated: false };
    }

    // If we have some data, calculate a basic score
    let score = 50; // Start neutral
    
    // Check positive factors
    if (ecoPositiveFactors && ecoPositiveFactors.length > 0) {
      score += ecoPositiveFactors.length * 5; // +5 per positive factor
    }
    
    // Check negative factors
    if (ecoNegativeFactors && ecoNegativeFactors.length > 0) {
      score -= ecoNegativeFactors.length * 8; // -8 per negative factor
    }
    
    score = Math.max(0, Math.min(100, score));
    
    // Calculate grade
    let grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F' = 'C';
    if (score >= 90) grade = 'A+';
    else if (score >= 85) grade = 'A';
    else if (score >= 80) grade = 'B+';
    else if (score >= 70) grade = 'B';
    else if (score >= 60) grade = 'C+';
    else if (score >= 50) grade = 'C';
    else if (score >= 40) grade = 'D';
    else grade = 'F';
    
    return { score, grade, isEstimated: true };
  };

  const { score, grade, isEstimated } = calculateBasicEcoScore();
  
  // If no data at all, show a placeholder message
  const hasNoData = ecoScore === undefined && !ecoGrade && 
                    (!ecoPositiveFactors || ecoPositiveFactors.length === 0) &&
                    (!ecoNegativeFactors || ecoNegativeFactors.length === 0);

  // Get color based on grade
  const getGradeColor = (grade: string): string => {
    if (grade.startsWith('A')) return 'text-green-600 bg-green-50 border-green-200';
    if (grade.startsWith('B')) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (grade.startsWith('C')) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (grade === 'D') return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-600" />
            Eco Score
            {isEstimated && (
              <Badge variant="outline" className="text-xs ml-2">
                Estimated
              </Badge>
            )}
          </CardTitle>
          {!hasNoData ? (
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`font-bold text-lg px-3 py-1 ${getGradeColor(grade)}`}
              >
                {grade}
              </Badge>
              <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
                {score}
              </span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`font-bold text-lg px-3 py-1 ${getGradeColor(grade)}`}
              >
                {grade}
              </Badge>
              <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
                {score}
              </span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
          )}
        </div>
        {hasNoData && (
          <p className="text-sm text-muted-foreground mt-2">
            Eco score will be calculated when this product is synced. Please sync products to see sustainability ratings.
          </p>
        )}
        {isEstimated && !hasNoData && (
          <p className="text-xs text-muted-foreground mt-1">
            This is an estimated score. Full analysis available after product sync.
          </p>
        )}
      </CardHeader>
      
      <CardContent>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <span className="text-sm text-muted-foreground">
                {isOpen ? 'Hide details' : 'Show reasoning'}
              </span>
              {isOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4 space-y-4">
            {/* Positive Factors */}
            {ecoPositiveFactors && ecoPositiveFactors.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <h4 className="text-sm font-semibold">Positive Factors</h4>
                </div>
                <ul className="space-y-1 ml-6">
                  {ecoPositiveFactors.map((factor, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Negative Factors */}
            {ecoNegativeFactors && ecoNegativeFactors.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <h4 className="text-sm font-semibold">Concerns</h4>
                </div>
                <ul className="space-y-1 ml-6">
                  {ecoNegativeFactors.map((factor, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-red-600 mt-1">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Reasoning */}
            {ecoReasoning && ecoReasoning.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <h4 className="text-sm font-semibold">Score Breakdown</h4>
                </div>
                <ul className="space-y-1 ml-6">
                  {ecoReasoning.map((reason, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {ecoRecommendations && ecoRecommendations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-yellow-600" />
                  <h4 className="text-sm font-semibold">Recommendations</h4>
                </div>
                <ul className="space-y-1 ml-6">
                  {ecoRecommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-yellow-600 mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

