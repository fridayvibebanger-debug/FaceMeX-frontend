import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function CareerAIPage() {
  return (
    <div className="min-h-screen bg-background pt-20 md:pt-16 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Career AI</h1>
          <p className="text-sm text-muted-foreground">DeepSeek-powered tools to build your CV, draft cover letters, and plan your job search.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>AI CV Builder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Turn your details into an ATS-friendly CV. Upgrade flow available for Creator+.</p>
              <div className="flex justify-end">
                <Button asChild>
                  <Link to="/ai/resume">Open</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Cover Letter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Generate a clean cover letter. Optional Creator+ rewrite for a stronger voice.</p>
              <div className="flex justify-end">
                <Button asChild>
                  <Link to="/ai/cover-letter">Open</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Job Assistant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Get 5 concise strategies: role focus, CV tweaks, application plan, networking, routine.</p>
              <div className="flex justify-end">
                <Button asChild>
                  <Link to="/ai/job-assistant">Open</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
