import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";

interface QuizQuestion {
    question: string;
    options: string[];
    correct_answer: string;
}

interface LessonQuizProps {
    quiz: QuizQuestion[];
    onComplete: () => void;
}

export default function LessonQuiz({ quiz, onComplete }: LessonQuizProps) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [completed, setCompleted] = useState(false);

    const currentQuestion = quiz[currentQuestionIndex];

    const handleOptionSelect = (option: string) => {
        if (selectedOption) return; // Prevent changing answer
        setSelectedOption(option);
        setIsCorrect(option === currentQuestion.correct_answer);
    };

    const handleNext = () => {
        if (currentQuestionIndex < quiz.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedOption(null);
            setIsCorrect(null);
        } else {
            setCompleted(true);
            onComplete();
        }
    };

    if (completed) {
        return (
            <Card className="w-full max-w-2xl mx-auto mt-8 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="pt-6 text-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-green-700 dark:text-green-300 mb-2">Quiz Completed!</h3>
                    <p className="text-muted-foreground">You've mastered this lesson's key concepts.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-2xl mx-auto mt-8">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Lesson Quiz</span>
                    <span className="text-sm font-normal text-muted-foreground">
                        Question {currentQuestionIndex + 1} of {quiz.length}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <h3 className="text-lg font-medium">{currentQuestion.question}</h3>
                <div className="grid gap-3">
                    {currentQuestion.options.map((option, index) => (
                        <Button
                            key={index}
                            variant={
                                selectedOption === option
                                    ? (option === currentQuestion.correct_answer ? "default" : "destructive")
                                    : "outline"
                            }
                            className={`justify-start h-auto py-3 px-4 text-left ${selectedOption && option === currentQuestion.correct_answer && selectedOption !== option
                                    ? "bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300"
                                    : ""
                                }`}
                            onClick={() => handleOptionSelect(option)}
                            disabled={!!selectedOption}
                        >
                            {option}
                            {selectedOption === option && (
                                <span className="ml-auto">
                                    {option === currentQuestion.correct_answer ? (
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-white" />
                                    )}
                                </span>
                            )}
                        </Button>
                    ))}
                </div>
            </CardContent>
            <CardFooter className="justify-end">
                <Button onClick={handleNext} disabled={!selectedOption}>
                    {currentQuestionIndex < quiz.length - 1 ? "Next Question" : "Finish Quiz"}
                </Button>
            </CardFooter>
        </Card>
    );
}
