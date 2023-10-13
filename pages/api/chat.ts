import { NextApiRequest, NextApiResponse } from "next";
import Axios, { AxiosError } from "axios";
import appConfig from "../../Config";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    try {
      const response = await Axios.post(appConfig.apiInvokeUrl, req.body, {
        headers: {
          // Include any necessary headers
          "Content-Type": "application/json",
          // Add Authorization header if required
          Authorization: req.headers.authorization || "",
        },
      });

      return res.status(200).json(response.data);
    } catch (error) {
      const axiosError = error as AxiosError; // Type assertion to AxiosError

      console.error("Error proxying to NestJS API:", axiosError.message);

      // Log the detailed error for diagnostics but return a generic error message to the client
      return res.status(axiosError.response?.status || 500).json({
        message: "An internal error occurred. Please try again later.",
      });
    }
  } else {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
  }
};
