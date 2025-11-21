/**
 * Chat Page
 * Full-page chat interface for Hair Salon AI
 */

import { Layout } from '../components/Layout';
import { ChatBox } from '../components/ChatBox';

const Chat = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-background pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)]">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-foreground mb-2">Hair Care Expert</h1>
            <p className="text-muted-foreground">
              Get personalized hair care advice from our AI expert
            </p>
          </div>
          <ChatBox className="h-full" />
        </div>
      </div>
    </Layout>
  );
};

export default Chat;

