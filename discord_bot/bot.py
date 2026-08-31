import datetime
import re
import discord
from discord.ext import commands
import humanize
import aiohttp
import os
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

if not TOKEN:
    raise ValueError("Please put your DISCORD_TOKEN here!")

GITHUB_REPO = "IlyaP358/fluxcast-domains"

EMOJI_OPEN = "<:pr_open:1534330402657796116>"
EMOJI_MERGED = "<:pr_merged:1534330404029468774>"
EMOJI_CLOSED = "<:pr_closed:1534330406890115093>"
EMOJI_DRAFT = "<:pr_draft:1534330405484757042>"

humanize.i18n.activate("en_US")

intents = discord.Intents.default()
intents.message_content = True


class GitHubBot(commands.Bot):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.session = None

    async def setup_hook(self):
        self.session = aiohttp.ClientSession()

    async def close(self):
        if self.session:
            await self.session.close()
        await super().close()

bot = GitHubBot(command_prefix="!", intents=intents)


@bot.event
async def on_message(message):
    if message.author.bot:
        return

    if message.channel.name != "pull-requests-check":
        return

    match = re.search(r"#+(\d+)", message.content)
    if match:
        pr_number = match.group(1)
        url = f"https://api.github.com/repos/{GITHUB_REPO}/pulls/{pr_number}"

        headers = {"Accept": "application/vnd.github.v3+json"}
        if GITHUB_TOKEN:
            headers["Authorization"] = f"token {GITHUB_TOKEN}"

        async with bot.session.get(url, headers=headers) as response:
            if response.status == 200:
                pr = await response.json()

                state = pr["state"]
                merged = pr.get("merged", False)
                draft = pr.get("draft", False)

                if state == "closed" and merged:
                    status_icon = EMOJI_MERGED
                    status_text = "Merged"
                    color = 0x8250DF
                elif state == "closed":
                    status_icon = EMOJI_CLOSED
                    status_text = "Closed"
                    color = 0xCF222E
                elif draft:
                    status_icon = EMOJI_DRAFT
                    status_text = "Draft"
                    color = 0x6E7681
                else:
                    status_icon = EMOJI_OPEN
                    status_text = "Opened"
                    color = 0x2DA44E

                created_at = datetime.datetime.fromisoformat(
                    pr["created_at"].replace("Z", "+00:00")
                )
                time_ago = humanize.naturaltime(
                    created_at, when=datetime.datetime.now(datetime.timezone.utc)
                )

                embed = discord.Embed(
                    title=pr["title"], url=pr["html_url"], color=color
                )

                embed.set_author(
                    name=pr["user"]["login"],
                    icon_url=pr["user"]["avatar_url"],
                    url=pr["user"]["html_url"],
                )

                embed.add_field(
                    name="Status",
                    value=f"{status_icon} {status_text} `{time_ago}`",
                    inline=False,
                )

                await message.reply(embed=embed, mention_author=True)

    await bot.process_commands(message)


bot.run(TOKEN)