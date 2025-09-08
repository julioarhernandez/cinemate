import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, UserPlus, UserCheck, UserX } from 'lucide-react';

const friends = [
  {
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    avatar: 'https://picsum.photos/100/100?random=11',
  },
  {
    name: 'John Smith',
    email: 'john.smith@example.com',
    avatar: 'https://picsum.photos/100/100?random=12',
  },
  {
    name: 'Emily White',
    email: 'emily.white@example.com',
    avatar: 'https://picsum.photos/100/100?random=13',
  },
];

const requests = [
  {
    name: 'Michael Brown',
    email: 'michael.brown@example.com',
    avatar: 'https://picsum.photos/100/100?random=14',
  },
];

export default function FriendsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Manage Friends
        </h1>
        <p className="text-muted-foreground">
          Connect with friends and see their movie ratings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-lg">Find Friends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex w-full max-w-lg items-center space-x-2">
            <Input
              type="email"
              placeholder="Enter friend's email"
              className="flex-1"
            />
            <Button type="submit">
              <UserPlus className="mr-2 h-4 w-4" /> Send Request
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="friends" className="w-full">
        <TabsList>
          <TabsTrigger value="friends">My Friends</TabsTrigger>
          <TabsTrigger value="requests">
            Friend Requests
            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {requests.length}
            </span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="friends">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {friends.map((friend) => (
              <Card key={friend.email}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={friend.avatar} alt={friend.name} />
                    <AvatarFallback>
                      {friend.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="truncate">
                    <p className="font-semibold">{friend.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {friend.email}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="requests">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {requests.map((request) => (
              <Card key={request.email}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={request.avatar} alt={request.name} />
                    <AvatarFallback>
                      {request.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 truncate">
                    <p className="font-semibold">{request.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {request.email}
                    </p>
                  </div>
                   <div className="flex gap-2">
                    <Button size="icon" variant="outline" className="text-green-500 hover:text-green-500 border-green-500/50 hover:bg-green-500/10">
                      <UserCheck className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" className="text-red-500 hover:text-red-500 border-red-500/50 hover:bg-red-500/10">
                      <UserX className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
