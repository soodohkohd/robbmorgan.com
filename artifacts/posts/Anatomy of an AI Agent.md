Anatomy of an AI Agent.

"The AI deleted the production database!"

Everyone in the room knows what happened. Almost nobody can tell you why.

So the blame lands on the model. It went rogue. It hallucinated. It cannot be trusted. That is the version that travels, because the model is the only part of the system most people can name.

Here is what actually happened.

The model asked. It emitted a tool name and a blob of JSON, which is the entire thing it is capable of doing, and then it stopped. A program on our side read that request and ran it. No approval gate. No allow-list. Nobody had decided in advance which actions were worth stopping for.

The model proposed. We disposed. We just did not know that was the arrangement we had built.

That is the uncomfortable part. Almost every incident like this is an execution failure, not an intelligence failure. We wrote the tool. We handed over the credentials. We skipped the gate, because a gate feels like something you add later, once things are working. Then we filed it under "AI problem," which is a comfortable place to put it, because it means nothing about how we work has to change.

You cannot gate what you cannot see. And you cannot see it when the vocabulary is one word doing seven jobs.

I build these systems, and I sit in the rooms where they get scoped, budgeted and signed off. What I kept running into was not a skills gap. It was that everyone at the table was using the same handful of words to mean different things, so the conversation quietly forked at the vocabulary long before it ever reached the decision. You cannot align on best practices when "agent" means the running program to one person, the model to another, and the whole initiative to a third.

So I wrote the level-set I wanted to hand people before those meetings. Seven words: platform, model, tool, agent, skill, MCP, interface. What each one actually is, who owns it, how it fails, and where the seams are that you can genuinely control.

Go read it: Anatomy of an AI Agent (https://lnkd.in/gbCiT7NB). Start with the story, it takes three minutes.

Imagine you hire the smartest consultant you have ever met. She works in a locked room. No phone, no memory, no hands. You slide notes under the door with a list of things you are willing to do on her behalf. She asks. You decide whether to say yes. She is the model. The whole arrangement, running as a loop, is the agent. And the gap between her asking and you saying yes is the only place in the system where anything can be stopped.

The rest is what surprises people later. What a run actually costs (twenty turns is roughly fifty-five times one call, not twenty). Why the same request can take a different path every time. What to ask when you are the one signing off.

Written for the technical and business people who end up in that room together.

Anatomy of an AI Agent - https://lnkd.in/gbCiT7NB

#AI #AIAgents #EngineeringLeadership #SoftwareArchitecture
