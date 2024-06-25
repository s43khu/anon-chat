import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase-client";
import { useEffect, useState } from "react";
import { Message, NewMessage } from "../types/collection";
import styled from "styled-components";
import { ChatMessage } from ".";
import defaultAvatar from "../assets/defaultAvatar.png";
import logo from "../assets/logo.png"; // Import the logo image

interface ChatRoomProps {
  session: Session;
}

export const ChatRoom = ({ session }: ChatRoomProps) => {
  const user = session.user as User;
  const [messages, setMessages] = useState<Message[]>();
  const [waitTime, setWaitTime] = useState<number>(0);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [messageToSend, setMessageToSend] = useState<string>("");

  const userName =
    user.user_metadata.preferred_username ||
    user.user_metadata.name ||
    user.email;

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from("chat").select("*");

      setMessages(data ?? []);
    };
    scrollToBottom(false);
    fetchData();
    const channel = supabase
      .channel("chat")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
        },
        () => {
          fetchData();
        }
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, []);

  const scrollToBottom = (smooth: boolean = true) => {
    setTimeout(() => {
      window.scroll({
        top: document.body.scrollHeight,
        behavior: smooth ? "smooth" : "instant",
      });
    }, 500);
  };

  const handleSendMessage = async () => {
    if (isSending || waitTime > 0) {
      return;
    }

    setIsSending(true);

    const newMessage: NewMessage = {
      user_name: userName,
      message_content: messageToSend,
      user_avatar_url: user.user_metadata.avatar_url || null,
      user_id: user.id,
      provider: user.app_metadata.provider || null,
    };

    const { error } = await supabase.from("chat").insert([newMessage]);

    if (error) {
      console.log(error.message);
    } else {
      setMessageToSend("");
      scrollToBottom();
      setIsSending(false);

      setWaitTime(3);
      const timer = setInterval(() => {
        setWaitTime((prevWaitTime) => prevWaitTime - 1);
      }, 1000);

      setTimeout(() => {
        clearInterval(timer);
        setWaitTime(0);
      }, 3000);
    }
  };

  return (
    <>
      <TopBar>
        <TopBarContent>
          <Logo src={logo} alt="logo" /> {/* Add the logo here */}
          <UserDetails>
            <Avatar
              src={user.user_metadata.avatar_url || defaultAvatar}
              alt="pfp"
            />
            <UserName>{userName}</UserName>
          </UserDetails>
          <SignOut onClick={() => supabase.auth.signOut()}>Sign Out</SignOut>
        </TopBarContent>
      </TopBar>
      <Container>
        {messages &&
          messages
            .sort((a, b) => a.id - b.id)
            .map((message: Message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isCurrentUser={user.id === message.user_id}
              />
            ))}
      </Container>
      <InputContainer>
        <MessageInput
          type="text"
          placeholder={
            waitTime > 0 ? `Wait ${waitTime} seconds` : "Type a message"
          }
          value={messageToSend}
          onChange={(e) => setMessageToSend(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          disabled={isSending || waitTime > 0}
        />
        <SendButton
          onClick={handleSendMessage}
          disabled={isSending || waitTime > 0 || messageToSend.length > 255}
        >
          {isSending ? "Sending..." : "Send"}
        </SendButton>
      </InputContainer>
    </>
  );
};

const TopBar = styled.div`
  position: fixed;
  top: 0;
  background-color: #000000;
  width: 100%;
  z-index: 1000;
`;

const TopBarContent = styled.div`
  display: flex;
  justify-content: space-between; /* Adjust to space between items */
  align-items: center;
  padding: 0 2vw;
  gap: 12px;
  @media (max-width: 1024px) {
    padding: 0 10px;
    gap: 4px;
  }
`;

const Logo = styled.img`
  height: 40px; /* Adjust the height as needed */
`;

const UserDetails = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const UserName = styled.p`
  font-size: 18px;
  font-weight: bold;
  color: #f5f6f7;

  @media (max-width: 768px) {
    display: none;
  }
`;

const SignOut = styled.button`
  padding: 10px 16px;
  font-size: 16px;
  margin: 8px;
  background: rgb(5 21 36);
  border-radius: 6px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: 0.3s border, 0.3s background;
  &:hover {
    border: 2px solid #f5f6f7;
    background: #3b5998;
    color: #f5f6f7;
  }
`;
const Avatar = styled.img`
  border-radius: 100%;
  width: 32px;

  @media (max-width: 768px) {
    display: none;
  }
`;

const Container = styled.div`
  padding: 20px;
  margin: 75px 2vw;

  @media (max-width: 1024px) {
    margin: 75px 0;
  }
`;

const InputContainer = styled.div`
  position: fixed;
  bottom: 0;
  margin: 0;
  background-color: #000000; /* Facebook blue color */
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 0;
`;

const MessageInput = styled.input`
  padding: 10px 18px;
  font-size: 18px;
  width: 70%;
  border-radius: 14px 0 0 14px;
  border: 2px solid transparent;
  transition: 0.3s all;
  &:not(:disabled) {
    &:hover {
      border: 2px solid #3b5998;
    }
    &:focus {
      outline: none;
      border: 2px solid #3b5998;
    }
  }
`;

const SendButton = styled.button`
  padding: 10px 18px;
  font-size: 18px;
  border-radius: 0 14px 14px 0;
  border: none;
  cursor: pointer;
  transition: 0.3s all;
  background-color: rgb(86 86 164 / 29%);
  border: 2px solid rgb(17 19 23);
  text-transform: uppercase;
  color: #f5f6f7;
  &:not(:disabled) {
    &:hover {
      background-color: #2a4887;
    }
  }
`;
