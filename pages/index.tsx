import React, { useState, useEffect, useRef } from "react";
import { Amplify } from "aws-amplify";
import { Auth } from "aws-amplify";
import appConfig from "../Config";
import { withAuthenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";

const robotIcon = "/robot.png";
const dots = "/three-dots.svg";
const sendIcon = "/send.png";
const settingIcon = "/settings.png";

type Message = {
  sender: string;
  content: string;
  timestamp: Date;
};

Amplify.configure({
  Auth: {
    identityPoolId: appConfig.cognitoIdentityPoolId,
    region: appConfig.region,
    identityPoolRegion: appConfig.region,
    userPoolId: appConfig.cognitoUserPoolId,
    userPoolWebClientId: appConfig.cognitoAppClientId,
  },
});

const App = () => {
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(false);

  // Use the generic parameter for useRef to type the ref
  const chatMessagesRef = useRef<HTMLDivElement | null>(null);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [nameInput, setNameInput] = useState<string>("プログラミングの先生");
  const [input, setInput] = useState<string>("");
  const [roleInput, setRoleInput] = useState<string>(
    "あなたはプログラミングの先生です。生徒からの質問に答えてください。",
  );

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [windowWidth, setWindowWidth] = useState<number | null>(null);

  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const session = await Auth.currentSession();
        const jwtToken: string = session.getIdToken().getJwtToken();

        // Check if the token is expired
        if (isTokenExpired(jwtToken)) {
          console.log("Token is expired. Signing out...");
          await Auth.signOut(); // Sign out if token is expired
          return;
        }

        setToken(jwtToken);
      } catch (error: any) {
        console.error("Error getting JWT token", error);
      }
    };

    const isTokenExpired = (token: string): boolean => {
      try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace("-", "+").replace("_", "/");
        const payload: { exp?: number } = JSON.parse(window.atob(base64));

        if (!payload.exp) throw new Error("Token expiration not found.");

        const expirationTime = payload.exp * 1000; // convert to milliseconds
        const currentTime = new Date().getTime();

        return currentTime > expirationTime;
      } catch (error: any) {
        console.error("Error decoding token", error);
        return false;
      }
    };

    fetchToken();
  }, []);

  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);

    // Initialize the width
    handleResize();

    // Cleanup the event listener on unmount
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMessages([
        {
          sender: "AI",
          content:
            "こんにちは私はプログラミングの先生です。気軽に質問してください。",
          timestamp: new Date(),
        },
      ]);

      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (typeof window === "undefined") {
      return; // Exit the function if running server-side
    }

    const targetElement = event.target as EventTarget & HTMLElement;

    if (
      sidebarVisible &&
      window.innerWidth < 768 &&
      !targetElement.closest(".sidebar") &&
      !targetElement.closest(".sidebar-toggle")
    ) {
      toggleSidebar();
    }
  };

  const handleSignOut = () => {};

  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [sidebarVisible]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() === "") return;

    const newMessage: Message = {
      sender: "user1",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prevMessages) => [...prevMessages, newMessage]);

    setInput("");

    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Add Authorization header if needed
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role: roleInput,
          message: input,
        }),
      });

      const responseData = await response.json();

      if (response.ok) {
        const aiMessage: Message = {
          sender: "AI",
          content: responseData.message,
          timestamp: new Date(),
        };
        setMessages((prevMessages) => [...prevMessages, aiMessage]);
      } else {
        throw responseData;
      }
    } catch (error) {
      console.error("Error calling the Lambda function:", error);
      // Handle any errors here, e.g., show a notification or a message
      const errorMessage = {
        sender: "AI",
        content: "エラーが起こりました。",
        timestamp: new Date(),
      };

      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    }

    setIsLoading(false);
  };

  return (
    <div className="App">
      <div className={sidebarVisible ? "overlay" : ""}></div>
      <div className={sidebarVisible ? "overlay" : ""}></div>
      <div
        className={`sidebar ${
          !sidebarVisible && (windowWidth || 0) < 768 ? "hidden" : ""
        }`}
      >
        <div className="sidebar-content">
          <div style={{ padding: 10 }}>
            <h2 style={{ fontWeight: "bold" }}>ロール</h2>
            <div style={{ marginBottom: "1em" }}>
              <textarea
                maxLength={20}
                rows={1}
                style={{
                  width: "100%",
                  padding: "0.5em",
                  fontSize: "1em",
                  marginBottom: "0.5em",
                }}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
              ></textarea>
              <textarea
                maxLength={100}
                rows={6}
                style={{
                  width: "100%",
                  padding: "0.5em",
                  fontSize: "1em",
                  marginBottom: "1em",
                }}
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
              ></textarea>
              <div className="signout-container">
                <button className="signout-button" onClick={handleSignOut}>
                  サインアウト
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="chat">
        <div className="chat-header sticky-top">
          <div className="chat-header-title">
            <h2 style={{ fontWeight: "bold" }}>{nameInput}</h2>
          </div>
          {/* Moved sidebar-button to the right side of the top bar */}
          <div className="sidebar-button" style={{ marginLeft: "auto" }}>
            <button className="sidebar-toggle" onClick={toggleSidebar}>
              <img src={settingIcon} alt="Send" className="settings-icon" />
            </button>
          </div>
        </div>
        <div className="chat-messages" ref={chatMessagesRef}>
          {messages.length > 0 &&
            messages.map((message, index) => (
              <div
                key={index}
                ref={
                  index === messages.length - 1 && messages.length !== 1
                    ? lastMessageRef
                    : null
                }
                className={`message ${
                  message.sender !== "AI" ? "current" : ""
                }`}
              >
                <div>
                  {message.sender === "AI" && (
                    <img
                      src={robotIcon}
                      alt="AI Robot"
                      className="robot-icon"
                    />
                  )}
                </div>
                <div
                  className={`message-section ${
                    message.sender !== "AI" ? "current" : ""
                  }`}
                >
                  <div className="message-content">{message.content}</div>
                </div>
              </div>
            ))}
          {isLoading && (
            <div className="loading-container">
              <img src={robotIcon} alt="AI Robot" className="robot-icon" />
              <img src={dots} alt="Loading Dots" className="dots-icon" />
            </div>
          )}
        </div>
        <form onSubmit={handleSendMessage} className="chat-form sticky-bottom">
          <input
            maxLength={2000}
            className="chat-input"
            type="text"
            placeholder="メッセージを入力してください"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="send-icon-button">
            <img src={sendIcon} alt="Send" className="send-icon" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default withAuthenticator(App);
