import Link from 'next/link';
import {
  Activity,
  Clapperboard,
  Film,
  Users,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function DashboardPage() {
  const stats = [
    {
      title: 'Movies Rated',
      value: '78',
      icon: Film,
      color: 'text-sky-500',
    },
    {
      title: 'Friends',
      value: '12',
      icon: Users,
      color: 'text-amber-500',
    },
    {
      title: 'AI Recommendations',
      value: '5',
      icon: Sparkles,
      color: 'text-violet-500',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Welcome back, Alex!
        </h1>
        <p className="text-muted-foreground">
          Here's a quick look at your CineMate world.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 text-muted-foreground ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Start a New Journey</CardTitle>
            <CardDescription>
              Ready for your next movie night?
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row">
            <Button asChild className="w-full">
              <Link href="/dashboard/movies">
                <Film className="mr-2 h-4 w-4" /> Browse Movies
              </Link>
            </Button>
            <Button asChild variant="secondary" className="w-full">
              <Link href="/dashboard/ai-recommender">
                <Sparkles className="mr-2 h-4 w-4" /> Get AI Suggestion
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Recent Activity</CardTitle>
            <CardDescription>
              See what you and your friends have been up to.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <Activity className="h-4 w-4 mt-1" />
              <p>
                You rated <strong>Inception</strong> 5 stars.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Activity className="h-4 w-4 mt-1" />
              <p>
                <strong>Jane Doe</strong> became your friend.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Activity className="h-4 w-4 mt-1" />
              <p>
                Your friend <strong>John Smith</strong> rated <strong>The Godfather</strong> 5 stars.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
