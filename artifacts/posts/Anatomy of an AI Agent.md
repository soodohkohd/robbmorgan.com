Anatomy of an AI Agent.

"The AI deleted the production database!"

Say that in a room of ten people and you get ten different stories. A model that went rogue. A bad prompt. Somebody who handed it too much access. A vendor problem. A few people quietly deciding this whole thing is too risky to keep going.

None of that is knowable from the sentence, because "AI" is standing in for three different things.

AI is the category. The whole field. On its own it explains nothing.

The model is the part that reads text and writes text. That is the entire repertoire. No memory between calls. No hands.

The agent is the arrangement around the model: a set of tools you offered it, and a loop where it asks for one and your code decides whether to run it.

Three different things, one word doing all the work. So when something goes wrong, nobody in the room can tell whether the model chose badly or the system around it let it through. Those have different fixes, and usually different owners.

That is why I wrote it down. The whole thing is on my site now, a piece called Anatomy of an AI Agent.

It is not a tutorial, and it is not a pitch for anything. It is a level-set: one shared picture of what each piece actually is and how they fit together, so everyone in the room is working from the same one before anybody starts assigning blame or budget.

It starts with a story. Imagine you hire the smartest consultant you have ever met. She works in a locked room. No phone, no memory, no hands. You slide notes under the door with a list of things you are willing to do on her behalf. She asks. You decide whether to do it. Then you do the actual work.

She is the model. The whole arrangement, running as a loop, is the agent. You cannot point at it, which is exactly why the word slides around so much.

Now go back to the database. The model never touched it, because it cannot touch anything. It asked. A program said yes without checking. The question was never whether the AI is dangerous. It was what we were willing to do on its behalf, and who approved that.

From there the same picture carries the rest of the vocabulary: platform, tool, skill, MCP, interface. With the model and the agent, that is seven words in total, all used interchangeably, all meaning something different.

The piece walks each one, plus the parts that surprise people later. What a run actually costs (twenty turns is roughly fifty-five times one call, not twenty). Why the same request can take a different path every time. What to ask when you are the one signing off.

Written for the technical and business people who end up in that room together. No prior setup assumed.

robbmorgan.com/code

#AI #AIAgents #EngineeringLeadership #SoftwareArchitecture
