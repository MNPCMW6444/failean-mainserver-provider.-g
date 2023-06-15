import React, {
  ReactNode,
  createContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { Typography } from "@mui/material";
import axios, { AxiosInstance } from "axios";

interface ProvideMainserverProps {
  children: ReactNode;
  tryInterval?: number;
}

const DEFAULT_TRY_INTERVAL = 3000;

const IDLE = "IDLE";
const CHECKING_MESSAGE = "Checking server availability...";
const BAD_MESSAGE = "Server is not available. Please try again later.";
const GOOD_STATUS = "good";

const domain =
  process.env.NODE_ENV === "development"
    ? "http://localhost:6555/"
    : "https://mainserver.failean.com/";

const axiosSettings = {
  baseURL: domain,
  timeout: 9999999,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
};

const checkServerAvailability = async (axiosInstance: AxiosInstance) => {
  try {
    return (await axiosInstance.get("areyoualive")).data.answer === "yes"
      ? GOOD_STATUS
      : BAD_MESSAGE;
  } catch (err) {
    return BAD_MESSAGE;
  }
};

export const MainserverContext = createContext<{
  axiosInstance: AxiosInstance;
  version: string;
}>({
  axiosInstance: axios.create(axiosSettings),
  version: "",
});

export const MainserverContextProvider = ({
  children,
  tryInterval,
}: ProvideMainserverProps) => {
  const [status, setStatus] = useState<string>(IDLE);
  const [version, setVersion] = useState<string>();
  const axiosInstance = axios.create(axiosSettings);

  const statusRef = useRef(status);

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
        {children}
      </MainserverContext.Provider>
    );
  } else {
    return <Typography>{status}</Typography>;
  }
};
