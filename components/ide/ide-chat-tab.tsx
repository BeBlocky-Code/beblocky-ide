"use client";

import { IChatMessage } from "@/types/ai";
import IdeMessageList from "./ide-message-list";
import IdeChatInput from "./ide-chat-input";

interface IdeChatTabProps {
  messages: IChatMessage[];
  inputValue: string;
  selectedConversationId: string;
  isThinking: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: (value?: string) => void;
  typedMessages: Set<string>;
  setTypedMessages: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export default function IdeChatTab({
  messages,
  inputValue,
  selectedConversationId,
  isThinking,
  onInputChange,
  onSendMessage,
  typedMessages,
  setTypedMessages,
}: IdeChatTabProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent">
      <IdeMessageList
        messages={messages}
        isThinking={isThinking}
        inputValue={inputValue}
        selectedConversationId={selectedConversationId}
        onInputChange={onInputChange}
        onSendMessage={onSendMessage}
        typedMessages={typedMessages}
        setTypedMessages={setTypedMessages}
      />
    </div>
  );
}
