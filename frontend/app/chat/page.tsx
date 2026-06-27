import ChatClient from "./chat-client";

export default async function Page(props: {
  searchParams?: Promise<{ conv?: string }>;
}) {
  const searchParams = await props.searchParams;
  return <ChatClient convId={searchParams?.conv} />;
}
