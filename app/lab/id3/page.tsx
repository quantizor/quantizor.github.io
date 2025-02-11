'use client';

import { useState } from 'react';
import SiteTitle from '@/components/Title';

export default function ID3() {
  const [showPlayer, setShowPlayer] = useState(false);

  return (
    <main
      className="text-[50px] text-justify leading-[0.78] tracking-[-2px] overflow-auto absolute inset-0 p-[5%] md:px-[10%] lg:px-[20%] text-red-950"
      style={{
        backgroundColor: '#f5e6d3',
        backgroundImage: `
          linear-gradient(to right, rgba(0,0,0,0.02), rgba(0,0,0,0.03)),
          linear-gradient(to bottom, rgba(0,0,0,0.02), rgba(0,0,0,0.03))
        `,
        backgroundSize: '100% 100%',
      }}
    >
      <SiteTitle>WAP</SiteTitle>
      <link href="https://fonts.googleapis.com/css2?family=UnifrakturCook:wght@700&display=swap" rel="stylesheet" />
      <pre className="break-words whitespace-normal first-letter:text-red-600 first-letter:text-[100px] first-letter:float-left first-letter:mr-1 selection:bg-yellow-300/50 selection:text-black">
        I said certified freak, seven days a week. <em>Wet</em> ass pussy, make that pullout game weak, woo! Yeah, yeah,
        yeah, yeah. Yeah, you fucking with some <em>wet</em> ass pussy. Bring a bucket and a mop for this <em>wet</em>{' '}
        ass pussy. Give me everything you got for this <em>wet</em> ass pussy. Beat it up, nigga, catch a charge. Extra
        large, and extra hard. Put this pussy right in yo' face. Swipe your nose like a credit card. Hop on top, I want
        a ride. I do a kegel while it's inside. Spit in my mouth, look at my eyes. This pussy is <em>wet</em>, come take
        a dive. Tie me up like I'm surprised. Let's role-play, I wear a disguise. I want you to park that big Mack truck
        right in this little garage. Make it cream, make me scream. Out in public, make a scene. I don't cook, I don't
        clean. But let me tell you, I got this ring. Gobble me, swallow me, drip down the side of me. Quick, jump out
        'fore you let it get inside of me. I tell him where to put it, never tell him where I'm 'bout to be. I run down
        on him 'fore I have a nigga running me. Talk yo' shit, bite your lip. Ask for a car while you ride that dick.
        You ain't never gotta fuck him for a thing. He already made his mind up 'fore he came. Now get your boots and
        your coat for this Pay my tuition just to kiss me on this <em>wet</em> ass pussy. Now make it rain if you wanna
        see some <em>wet</em> ass pussy. Look, I need a hard hitter, I need a deep stroke. I need a Henny drink, I need
        a weed smoker. Not a garden snake, I need a king cobra. With a hook in it, hope it lean over. He got some money,
        then that's where I'm headed. Pussy A-1, just like his credit. He got a beard, well, I'm tryna <em>wet</em> it.
        I let him taste it, and now he diabetic. I don't wanna spit, I wanna gulp. I wanna gag, I wanna choke. I want
        you to touch that lil' dangly thing that swing in the back of my throat. My head game is fire, punani Dasani.
        It's going in dry, and it's coming out soggy. I ride on that thing like the cops is behind me. I spit on his
        mic' and now he tryna sign me, woo. Your honor, I'm a freak bitch, handcuffs, leashes. Switch my wig, make him
        feel like he cheating. Put him on his knees, give him some' to believe in. Never lost a fight, but I'm looking
        for a beating. In the food chain, I'm the one that eat ya. If he ate my ass, he's a bottom feeder. Big D stand
        for big demeanor. I could make ya bust before I ever meet ya. If it don't hang, then he can't bang. You can't
        hurt my feelings, but I like pain. If he fuck me and ask, "Whose is it?". When I ride the dick, I'ma spell my
        name, ah. Yeah, yeah, yeah. Yeah, you fucking with some <em>wet</em> ass pussy. Bring a bucket and a mop for
        this <em>wet</em> ass pussy. Give me everything you got for this <em>wet</em> ass pussy. Now from the top, make
        it drop, that's some <em>wet</em> ass pussy. Now get a bucket and a mop, that's some <em>wet</em> ass pussy. I'm
        talking WAP, WAP, WAP, that's some <em>wet</em> ass pussy. Macaroni in a pot, that's some <em>wet</em> ass
        pussy, huh. There's some whores in this house.
      </pre>

      {showPlayer ? (
        <div className="h-[80px] w-full shrink-0 relative grayscale">
          <iframe
            src="https://open.spotify.com/embed/track/4Oun2ylbjFKMPTiaSbbCih?utm_source=oembed&autoplay"
            style={{ top: 0, left: 0, width: '100%', height: '100%', position: 'absolute', border: 0 }}
            allowFullScreen
            allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture;"
          />
        </div>
      ) : (
        <button className="hover:text-red-800 text-2xl" onClick={() => setShowPlayer(true)}>
          Load thy tune?
        </button>
      )}

      <style jsx>{`
        main {
          font-family: 'UnifrakturCook', serif;
        }

        pre {
          font-family: inherit;
        }

        pre em {
          color: darkred;
        }
      `}</style>
    </main>
  );
}
