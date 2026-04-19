"use server";

import axios from "axios";
import TravelFormSchema from "../types/formSchema";
import { Eateries, Faqs, Itinerary } from "../types/itinerary";
import ItineraryModel from "@/db/models/itineraries";
import { getPopularDestinations } from "./getPopularDestinations";
import { v4 as uuidv4 } from "uuid";
import dbConnect from "@/db/connect";
function getNumberOfDays(startDate: Date, endDate: Date): number {
  const oneDayInMilliseconds = 24 * 60 * 60 * 1000; // Hours * minutes * seconds * milliseconds
  const differenceInTime = endDate.getTime() - startDate.getTime();
  const differenceInDays = Math.round(differenceInTime / oneDayInMilliseconds);
  return differenceInDays;
}

async function fetchData<T>(
  url: string,
  data: object,
  headers: object
): Promise<T> {
  // console.log("Fetching now");
  for (let attempt = 0; attempt < 3; attempt++) {
    console.log(`Attempt ${attempt + 1} \n\n\n\n\n`);
    try {
      const res = await axios.post(url, data, { headers });
      // console.log(res.data?.choices[0]?.message?.content);
      const response = res.data?.choices[0]?.message?.content;
      let subs = response;
      if (response[0]=='`') subs = response
        .substring(7, response.length - 3)
        .replace(/[^\{\}\[\]\w\s,":]/g, "");
      const result = JSON.parse(subs);

      if (typeof result === "object" && result !== null) {
        return result as T;
      } else {
        throw new Error("Response is not a valid JSON object");
      }
    } catch (error) {
      console.error(
        `Attempt ${attempt + 1} failed: ${(error as Error).message}`
      );
      if (attempt === 2) {
        throw new Error(`Failed after 3 attempts: ${(error as Error).message}`);
      }
    }
  }

  throw new Error("Unexpected error"); // This line should never be reached
}

export const generateItinerary = async (
  input: TravelFormSchema
): Promise<Itinerary> => {
  console.log("inside");
  const data = {
    replacements: {
      dest: input.destination,
      days: getNumberOfDays(
        input.travelDates.startDate,
        input.travelDates.endDate
      ),
      people: input.numberOfPeople,
      companion: input.travelCompanions,
      type: input.travelType,
      interests: input.keyInterests.join(", "),
      budget: input.budget,
    },
    promptid: "19e373ea-0b75-47a2-9eae-6f36d2ffd7c8",
  };

  const headers = {
    "Content-Type": "application/json",
    "x-hl-api-key": process.env.HYPERLEAP_API_KEY!,
  };

  return await fetchData<Itinerary>(
    "https://api.hyperleap.ai/prompts",
    data,
    headers
  );
};

export const getBestEateries = async (
  input: TravelFormSchema
): Promise<Eateries> => {
  const data = {
    replacements: {
      dest: input.destination,
      days: getNumberOfDays(
        input.travelDates.startDate,
        input.travelDates.endDate
      ),
      people: input.numberOfPeople,
      companion: input.travelCompanions,
      type: input.travelType,
      interests: input.keyInterests.join(", "),
      budget: input.budget,
    },
    promptid: "23b99371-a215-4ed5-95a7-898472b1c0ed",
  };

  const headers = {
    "Content-Type": "application/json",
    "x-hl-api-key": process.env.HYPERLEAP_API_KEY!,
  };

  return await fetchData<Eateries>(
    "https://api.hyperleap.ai/prompts",
    data,
    headers
  );
};

export const getFaqs = async (input: TravelFormSchema): Promise<Faqs> => {
  const data = {
    replacements: {
      dest: input.destination,
      days: getNumberOfDays(
        input.travelDates.startDate,
        input.travelDates.endDate
      ),
      people: input.numberOfPeople,
      companion: input.travelCompanions,
      type: input.travelType,
      interests: input.keyInterests.join(", "),
      budget: input.budget,
    },
    promptid: "70111cfb-c8f2-4adf-b487-fd410b805abc",
  };

  const headers = {
    "Content-Type": "application/json",
    "x-hl-api-key": process.env.HYPERLEAP_API_KEY!,
  };

  return await fetchData<Faqs>(
    "https://api.hyperleap.ai/prompts",
    data,
    headers
  );
};

export const generateFullTravelPlan = async (input: TravelFormSchema) => {
  try {
    // Call all functions concurrently
    await dbConnect();
    const [itinerary, eateries, faqs, popularDestinations] = await Promise.all([
      generateItinerary(input),
      getBestEateries(input),
      getFaqs(input),
      getPopularDestinations(input.destination),
    ]);
    const uuid = uuidv4();
    // Combine the results into a single object
    const travelPlan = {
      uuid,
      destination: input.destination,
      travelDates: input.travelDates,
      budget: input.budget,
      travelType: input.travelType,
      keyInterests: input.keyInterests,
      numberOfPeople: input.numberOfPeople,
      travelCompanions: input.travelCompanions,
      itinerary: itinerary.days,
      eateries: eateries,
      faqs: faqs,
      popularDestinations: popularDestinations,
    };

    // Save the combined object to MongoDB
    const savedTravelPlan = await ItineraryModel.create(travelPlan);

    console.log("Travel plan saved:", uuid);
    return uuid;
  } catch (error) {
    console.error("Error generating full travel plan:", error);
    throw new Error("Failed to generate full travel plan");
  }
};
