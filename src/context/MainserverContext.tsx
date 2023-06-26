import React, {
  ReactNode,
  createContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { Typography } from "@mui/material";
import axios, { AxiosInstance } from "axios";
import { ApolloClient, InMemoryCache, ApolloProvider } from "@apollo/client";

interface MainserverProviderProps {
  children: ReactNode;
  tryInterval?: number;
  env?: "tst" | "dev";
}

const DEFAULT_TRY_INTERVAL = 3000;

const IDLE = "IDLE";
const CHECKING_MESSAGE = "Checking server availability...";
const BAD_MESSAGE = "Server is not available. Please try again later.";
const GOOD_STATUS = "good";

const checkServerAvailability = async (axiosInstance: AxiosInstance) => {
  try {
    return (await axiosInstance.get("areyoualive")).data.answer === "yes"
      ? GOOD_STATUS
      : BAD_MESSAGE;
  } catch (err) {
    return BAD_MESSAGE;
  }
};

interface MainserverContextProps {
  axiosInstance: AxiosInstance;
  version: string;
}

export const MainserverContext = createContext<MainserverContextProps | null>(
  null
);

export const MainserverProvider = ({
  children,
  tryInterval,
  env,
}: MainserverProviderProps) => {
  const [status, setStatus] = useState<string>(IDLE);
  const [version, setVersion] = useState<string>();

  const statusRef = useRef(status);

  const baseURL =
    process.env.NODE_ENV === "development"
      ? "http://localhost:6555/"
      : `https://${env || ""}mainserver.failean.com/`;

  const axiosInstance = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
    },
  });

  const client = new ApolloClient({
    uri: baseURL + "graphql",
    cache: new InMemoryCache(),
  });

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    const setStatusAsyncly = async () => {
      setStatus(CHECKING_MESSAGE);
      const newStatus = await checkServerAvailability(axiosInstance);
      const { data } = await axiosInstance.get("areyoualive");
      setStatus(newStatus);
      setVersion(data.version);
      if (newStatus !== GOOD_STATUS) {
        setTimeout(setStatusAsyncly, tryInterval || DEFAULT_TRY_INTERVAL);
      }
    };
    if (statusRef.current === IDLE) {
      setStatusAsyncly();
    }
  }, [axiosInstance, tryInterval]);

  if (status === GOOD_STATUS) {
    return (
      <MainserverContext.Provider
        value={{ version: version || "", axiosInstance }}
      >
        <ApolloProvider client={client}>{children}</ApolloProvider>
      </MainserverContext.Provider>
    );
  } else {
    return <Typography>{status}</Typography>;
  }
};
