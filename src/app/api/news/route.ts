import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/index";
import { newsArticles } from "@db/schema";
import { desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Number(searchParams.get("limit") ?? 20);

    const articles = await db
      .select()
      .from(newsArticles)
      .orderBy(desc(newsArticles.publishedAt))
      .limit(limit);

    // Parse related tickers from JSON string
    const parsed = articles.map((article) => ({
      ...article,
      relatedTickers: article.relatedTickers
        ? JSON.parse(article.relatedTickers)
        : [],
    }));

    return NextResponse.json({ articles: parsed });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch news", articles: [] },
      { status: 200 }
    );
  }
}
