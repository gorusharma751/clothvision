import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Star, ArrowRight, Play } from 'lucide-react';
import api from '../../utils/api';

const useCMS = () => {
  const [cms, setCms] = useState({
    hero_title: 'AI Image Generator for',
    hero_highlight: 'Fashion & Product Shoots',
    hero_subtitle: 'Generate studio-quality e-commerce photos, on-model fashion shots, and marketing visuals using AI. No studio, no cost.',
    hero_badge: '🔥 Trusted by 50,000+ sellers',
    cta_primary: 'Start Creating Free',
    stats: [
      {value:'30+',label:'Studio Features'},
      {value:'50K+',label:'Active Users'},
      {value:'100K+',label:'Images Generated'},
      {value:'1K+',label:'Happy Brands'},
    ],
    features: [
      {icon:'👗',title:'Fashion Try-On',desc:'Model wears your product — face locked, color exact'},
      {icon:'🛋️',title:'Scene Builder',desc:'Place product in any background — car, room, table'},
      {icon:'🎬',title:'Video Studio',desc:'AI video script + frames for Luma/Runway'},
      {icon:'🏷️',title:'Label Creator',desc:'Design professional product labels & tags'},
      {icon:'🔄',title:'360° View',desc:'Front/Left/Back/Right for e-commerce viewers'},
      {icon:'📋',title:'Listing Content',desc:'Amazon & Flipkart descriptions auto-generated'},
      {icon:'📸',title:'Marketing Poster',desc:'Instagram/Facebook ad posters with your branding'},
      {icon:'📏',title:'Size Measurement',desc:'AI estimates product dimensions from photos'},
    ],
    testimonials: [
      {name:'Rahul S.',role:'Fashion Brand Owner',text:'ClothVision replaced our photoshoots. We generate all product images with AI in minutes.',rating:5},
      {name:'Priya M.',role:'Accessories Seller',text:'Needed on-model photos without hiring models. ClothVision gives exactly that — in seconds!',rating:5},
      {name:'Arjun K.',role:'D2C Clothing Brand',text:'Best AI tool for Flipkart/Amazon listings. Product color stays exact every time.',rating:5},
    ],
    why_items: [
      {icon:'⚡',title:'Lightning Fast',desc:'Studio-quality images in seconds'},
      {icon:'🎯',title:'Color Accurate',desc:'Product color preserved 100% — no shifts'},
      {icon:'🔒',title:'Face Locked',desc:'Model face stays identical across all angles'},
      {icon:'💰',title:'Cost Effective',desc:'Up to 95% cheaper than traditional shoots'},
    ],
    announcement: '🚀 NEW: 360° View Generator + Marketing Studio now live!',
    show_announcement: true,
  });
  useEffect(() => {
    api
      .get('/landing/cms')
      .then((r) => {
        const d = r?.data;
        if (d && !d.error) setCms((p) => ({ ...p, ...d }));
      })
      .catch(() => {});
  }, []);
  return cms;
};

export default function LandingPage() {
  const cms = useCMS();
  const [faqOpen, setFaqOpen] = useState(null);

  const faqs = [
    {q:'What is ClothVision AI?',a:'ClothVision AI uses Google Gemini to generate professional product photos. Upload your product image, choose settings, and AI creates studio-quality photos in seconds.'},
    {q:'Is it suitable for Flipkart & Amazon sellers?',a:'Yes! We generate images in exact Flipkart (1:1 square) and Amazon (4:3 landscape) formats with proper backgrounds and angles.'},
    {q:'Can I create on-model fashion photos?',a:'Yes. Upload product + model photo. AI places product on model with face locked and color preserved 100%.'},
    {q:'Do I need design skills?',a:'Zero skills needed. Just upload your product photo and click generate.'},
    {q:'How do I get credits?',a:'Contact your administrator to get starter credits added to your account.'},
    {q:'Can I download in high resolution?',a:'Yes! All images can be upscaled to 2400px HD quality.'},
  ];

  return (
    <div style={{background:'#0a0a0f',color:'#e2e2f0',fontFamily:'DM Sans,sans-serif',minHeight:'100vh',overflowX:'hidden'}}>

      {cms.show_announcement && (
        <div style={{background:'linear-gradient(90deg,#7c3aed,#4c1d95)',padding:'9px 20px',textAlign:'center',fontSize:13,fontWeight:600}}>
          {cms.announcement}
          <Link to="/register" style={{color:'#f0b429',marginLeft:12,textDecoration:'none'}}>Get Started →</Link>
        </div>
      )}

      {/* Navbar */}
      <nav style={{position:'sticky',top:0,zIndex:100,background:'rgba(10,10,15,.94)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(124,58,237,.15)',padding:'14px 5%',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:32,height:32,borderRadius:9,background:'linear-gradient(135deg,#7c3aed,#4c1d95)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Sparkles size={16} color="#fff"/>
          </div>
          <span style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.1rem',background:'linear-gradient(90deg,#a78bfa,#f0b429)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>ClothVision</span>
        </div>
        <div style={{display:'flex',gap:24,alignItems:'center',fontSize:14,color:'rgba(226,226,240,.55)'}}>
          {[['Features','#features'],['How It Works','#how'],['Pricing','#pricing'],['FAQs','#faqs']].map(([l,h])=>(
            <a key={l} href={h} style={{color:'rgba(226,226,240,.55)',textDecoration:'none',transition:'color .2s'}}
              onMouseEnter={e=>e.target.style.color='#fff'} onMouseLeave={e=>e.target.style.color='rgba(226,226,240,.55)'}>{l}</a>
          ))}
        </div>
        <div style={{display:'flex',gap:10}}>
          <Link to="/login" style={{padding:'8px 18px',borderRadius:10,border:'1px solid rgba(124,58,237,.3)',color:'#a78bfa',textDecoration:'none',fontSize:13,fontWeight:600}}>Login</Link>
          <Link to="/register" style={{padding:'8px 18px',borderRadius:10,background:'linear-gradient(135deg,#7c3aed,#6d28d9)',color:'#fff',textDecoration:'none',fontSize:13,fontWeight:700}}>Try Now →</Link>
        </div>
      </nav>

      {/* Hero */}
      <section id="hero" style={{padding:'90px 5% 70px',textAlign:'center',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:'15%',left:'5%',width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(124,58,237,.1),transparent)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:'5%',right:'5%',width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(240,180,41,.07),transparent)',pointerEvents:'none'}}/>
        <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'6px 16px',borderRadius:20,background:'rgba(124,58,237,.12)',border:'1px solid rgba(124,58,237,.25)',marginBottom:24,fontSize:13,color:'#a78bfa'}}>
          <span style={{width:7,height:7,borderRadius:'50%',background:'#a78bfa',display:'inline-block'}}/>
          {cms.hero_badge}
        </div>
        <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'clamp(2rem,5.5vw,4rem)',lineHeight:1.1,marginBottom:18,maxWidth:900,margin:'0 auto 18px'}}>
          {cms.hero_title}{' '}
          <span style={{background:'linear-gradient(90deg,#a78bfa,#f0b429)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{cms.hero_highlight}</span>
        </h1>
        <p style={{fontSize:'clamp(.95rem,2vw,1.15rem)',color:'rgba(226,226,240,.5)',maxWidth:580,margin:'0 auto 36px',lineHeight:1.75}}>
          {cms.hero_subtitle}
        </p>
        <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap',marginBottom:22}}>
          <Link to="/register" style={{padding:'14px 32px',borderRadius:12,background:'linear-gradient(135deg,#7c3aed,#6d28d9)',color:'#fff',textDecoration:'none',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1rem',display:'inline-flex',alignItems:'center',gap:8}}>
            {cms.cta_primary} <ArrowRight size={18}/>
          </Link>
          <a href="#how" style={{padding:'14px 24px',borderRadius:12,border:'1px solid rgba(124,58,237,.3)',color:'#a78bfa',textDecoration:'none',fontWeight:600,fontSize:'1rem',display:'inline-flex',alignItems:'center',gap:8}}>
            <Play size={15}/> See How It Works
          </a>
        </div>
        <div style={{display:'flex',gap:20,justifyContent:'center',flexWrap:'wrap',fontSize:13,color:'rgba(162,140,250,.45)'}}>
          {['✓ Free HD Download','✓ No Watermark','✓ Color Accurate','✓ Face Preserved'].map(t=><span key={t}>{t}</span>)}
        </div>
        <div style={{marginTop:56,display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap'}}>
          {['👗 Dress → Model Shot','⌚ Watch → Scene Builder','🔄 360° View Generator','🎬 Video Script + Frames','🏷️ Product Label Creator','📱 Instagram Poster'].map((item,i)=>(
            <div key={i} style={{background:'#111118',border:'1px solid rgba(124,58,237,.18)',borderRadius:12,padding:'12px 18px',fontSize:13,color:'rgba(226,226,240,.65)',fontWeight:500,transition:'all .25s',cursor:'default'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(124,58,237,.45)';e.currentTarget.style.transform='translateY(-3px)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(124,58,237,.18)';e.currentTarget.style.transform='';}}>
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section style={{padding:'36px 5%',borderTop:'1px solid rgba(124,58,237,.1)',borderBottom:'1px solid rgba(124,58,237,.1)',background:'rgba(124,58,237,.02)'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:20,maxWidth:800,margin:'0 auto',textAlign:'center'}}>
          {cms.stats?.map((s,i)=>(
            <div key={i}>
              <p style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'clamp(1.8rem,3vw,2.5rem)',color:'#f0b429',marginBottom:4}}>{s.value}</p>
              <p style={{fontSize:13,color:'rgba(226,226,240,.4)'}}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Choose */}
      <section id="features" style={{padding:'80px 5%',textAlign:'center'}}>
        <p style={{fontSize:11,letterSpacing:'.18em',color:'rgba(162,140,250,.45)',fontFamily:'Syne,sans-serif',marginBottom:12}}>WHY CLOTHVISION</p>
        <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'clamp(1.8rem,4vw,2.8rem)',marginBottom:12}}>
          Why Choose <span style={{color:'#f0b429'}}>ClothVision AI?</span>
        </h2>
        <p style={{color:'rgba(226,226,240,.42)',maxWidth:520,margin:'0 auto 52px',fontSize:'.95rem',lineHeight:1.7}}>
          Create professional, consistent, high-converting product photos without studios, shoots, or high costs.
        </p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:16,maxWidth:1000,margin:'0 auto 64px'}}>
          {cms.why_items?.map((item,i)=>(
            <div key={i} style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:'26px 20px',textAlign:'left',transition:'all .3s'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(124,58,237,.4)';e.currentTarget.style.transform='translateY(-3px)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='#1e1e2d';e.currentTarget.style.transform='';}}>
              <span style={{fontSize:30,display:'block',marginBottom:12}}>{item.icon}</span>
              <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,fontSize:'1rem',marginBottom:6,color:'#fff'}}>{item.title}</h3>
              <p style={{fontSize:13,color:'rgba(162,140,250,.45)',lineHeight:1.6}}>{item.desc}</p>
            </div>
          ))}
        </div>
        <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'clamp(1.5rem,3vw,2rem)',marginBottom:36}}>
          All Studio <span style={{color:'#a78bfa'}}>Features</span>
        </h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:14,maxWidth:1100,margin:'0 auto'}}>
          {cms.features?.map((f,i)=>(
            <div key={i} style={{background:'#111118',border:'1px solid rgba(124,58,237,.12)',borderRadius:14,padding:'18px',textAlign:'left',display:'flex',gap:12,alignItems:'flex-start',transition:'all .3s'}}
              onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(124,58,237,.38)'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(124,58,237,.12)'}>
              <span style={{fontSize:26,flexShrink:0}}>{f.icon}</span>
              <div>
                <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,fontSize:'.92rem',color:'#fff',marginBottom:4}}>{f.title}</h3>
                <p style={{fontSize:12,color:'rgba(162,140,250,.42)',lineHeight:1.55}}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how" style={{padding:'80px 5%',background:'rgba(124,58,237,.02)',borderTop:'1px solid rgba(124,58,237,.08)'}}>
        <div style={{textAlign:'center',marginBottom:52}}>
          <p style={{fontSize:11,letterSpacing:'.18em',color:'rgba(162,140,250,.45)',fontFamily:'Syne,sans-serif',marginBottom:12}}>SIMPLE PROCESS</p>
          <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'clamp(1.8rem,4vw,2.8rem)'}}>
            How It <span style={{color:'#f0b429'}}>Works</span>
          </h2>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:20,maxWidth:1100,margin:'0 auto'}}>
          {[
            {step:'01',icon:'📸',title:'Upload Product Image',desc:'Upload any product — clothing, jewelry, gadgets, or accessories. AI instantly reads and analyzes it.'},
            {step:'02',icon:'🎨',title:'Choose Studio Type',desc:'Pick from Fashion Try-On, Scene Builder, 360° View, Video Studio, Label Creator, or Marketing Poster.'},
            {step:'03',icon:'⚡',title:'AI Generates Instantly',desc:'Gemini AI creates professional photos with exact product color and face preserved 100%.'},
            {step:'04',icon:'⬇️',title:'Download & Publish',desc:'Download HD images ready for Amazon, Flipkart, Instagram ads in seconds.'},
          ].map((s,i)=>(
            <div key={i} style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:24,position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:12,right:16,fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'3.5rem',color:'rgba(124,58,237,.06)',lineHeight:1}}>{s.step}</div>
              <span style={{fontSize:30,display:'block',marginBottom:12}}>{s.icon}</span>
              <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff',marginBottom:8,fontSize:'1rem'}}>{s.title}</h3>
              <p style={{fontSize:13,color:'rgba(162,140,250,.45)',lineHeight:1.65}}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Boost Sales */}
      <section style={{padding:'80px 5%'}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:40,alignItems:'center'}}>
          <div>
            <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'clamp(1.6rem,3.5vw,2.4rem)',marginBottom:16,lineHeight:1.2}}>
              Boost Your <span style={{color:'#f0b429'}}>E-commerce Sales</span> with ClothVision
            </h2>
            <p style={{color:'rgba(226,226,240,.45)',marginBottom:24,lineHeight:1.75,fontSize:'.95rem'}}>
              AI analyzes your product images and generates the highest CTR visuals for Flipkart & Amazon.
            </p>
            <Link to="/register" style={{display:'inline-flex',alignItems:'center',gap:8,padding:'12px 24px',borderRadius:12,background:'rgba(124,58,237,.12)',border:'1px solid rgba(124,58,237,.3)',color:'#a78bfa',textDecoration:'none',fontWeight:600,fontSize:14}}>
              Create FREE Product Images <ArrowRight size={15}/>
            </Link>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {[
              {title:'Without AI',period:'Last Month',amount:'₹49,876',orders:'638 orders',bg:'rgba(255,255,255,.02)',border:'rgba(30,30,45,.8)',extra:null},
              {title:'With ClothVision',period:'This Month',amount:'₹1,05,849',orders:'1,198 orders',bg:'rgba(124,58,237,.06)',border:'rgba(124,58,237,.35)',extra:['+88% Orders','+112% Revenue']},
            ].map((c,i)=>(
              <div key={i} style={{background:c.bg,border:`1px solid ${c.border}`,borderRadius:14,padding:16}}>
                <p style={{fontSize:11,color:'rgba(162,140,250,.4)',marginBottom:3}}>{c.title}</p>
                <p style={{fontSize:11,color:'rgba(162,140,250,.28)',marginBottom:10}}>{c.period}</p>
                <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1.1rem',color:i===1?'#f0b429':'rgba(226,226,240,.35)',marginBottom:4}}>{c.amount}</p>
                <p style={{fontSize:11,color:'rgba(162,140,250,.35)'}}>{c.orders}</p>
                {c.extra&&<div style={{display:'flex',flexDirection:'column',gap:4,marginTop:10}}>
                  {c.extra.map(e=><span key={e} style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:6,background:'rgba(240,180,41,.12)',color:'#f0b429'}}>{e}</span>)}
                </div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{padding:'80px 5%',textAlign:'center',background:'rgba(124,58,237,.02)',borderTop:'1px solid rgba(124,58,237,.08)'}}>
        <p style={{fontSize:11,letterSpacing:'.18em',color:'rgba(162,140,250,.45)',fontFamily:'Syne,sans-serif',marginBottom:12}}>PRICING</p>
        <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'clamp(1.8rem,4vw,2.8rem)',marginBottom:12}}>
          Pricing & <span style={{color:'#f0b429'}}>Plans</span>
        </h2>
        <p style={{color:'rgba(226,226,240,.42)',maxWidth:520,margin:'0 auto 44px',fontSize:'.95rem',lineHeight:1.7}}>
          Traditional photoshoots cost ₹10,000–₹50,000 per session. ClothVision uses a simple credit system.
        </p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16,maxWidth:780,margin:'0 auto'}}>
          {[
            {credits:50,price:'₹99',label:'Starter',color:'#a78bfa',popular:false},
            {credits:200,price:'₹299',label:'Popular',color:'#f0b429',popular:true},
            {credits:500,price:'₹599',label:'Pro',color:'#4ade80',popular:false},
          ].map((plan,i)=>(
            <div key={i} style={{background:'#111118',border:`${plan.popular?'2px':'1px'} solid ${plan.popular?'rgba(240,180,41,.5)':'rgba(124,58,237,.2)'}`,borderRadius:18,padding:24,textAlign:'center',position:'relative',overflow:'hidden'}}>
              {plan.popular&&<div style={{position:'absolute',top:10,right:10,background:'rgba(240,180,41,.18)',color:'#f0b429',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:8}}>POPULAR</div>}
              <p style={{fontSize:12,color:'rgba(162,140,250,.45)',marginBottom:6}}>{plan.label}</p>
              <p style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'2.2rem',color:plan.color,marginBottom:2}}>{plan.credits}</p>
              <p style={{fontSize:12,color:'rgba(162,140,250,.35)',marginBottom:14}}>credits</p>
              <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1.5rem',color:'#fff',marginBottom:18}}>{plan.price}</p>
              <Link to="/login" style={{display:'block',padding:'10px',borderRadius:10,background:plan.popular?'linear-gradient(135deg,#f0b429,#d69e2e)':'rgba(124,58,237,.18)',color:plan.popular?'#000':'#a78bfa',textDecoration:'none',fontWeight:700,fontSize:13}}>
                Request Credits
              </Link>
            </div>
          ))}
        </div>
        <p style={{marginTop:18,fontSize:12,color:'rgba(162,140,250,.3)'}}>Credits are added by admin. Contact your administrator to get started.</p>
      </section>

      {/* Testimonials */}
      <section style={{padding:'80px 5%'}}>
        <div style={{textAlign:'center',marginBottom:48}}>
          <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'clamp(1.8rem,4vw,2.8rem)',marginBottom:10}}>
            What <span style={{color:'#f0b429'}}>Sellers Say</span>
          </h2>
          <p style={{color:'rgba(226,226,240,.42)',fontSize:'.95rem'}}>Join thousands of sellers already using ClothVision</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:18,maxWidth:1000,margin:'0 auto'}}>
          {cms.testimonials?.map((t,i)=>(
            <div key={i} style={{background:'#111118',border:'1px solid #1e1e2d',borderRadius:16,padding:24}}>
              <div style={{display:'flex',gap:2,marginBottom:12}}>{[...Array(t.rating)].map((_,j)=><Star key={j} size={13} fill="#f0b429" color="#f0b429"/>)}</div>
              <p style={{fontSize:13,color:'rgba(226,226,240,.68)',lineHeight:1.75,marginBottom:14}}>"{t.text}"</p>
              <p style={{fontSize:13,fontWeight:600,color:'#fff'}}>— {t.name}</p>
              <p style={{fontSize:12,color:'rgba(162,140,250,.4)'}}>{t.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQs */}
      <section id="faqs" style={{padding:'80px 5%',background:'rgba(124,58,237,.02)',borderTop:'1px solid rgba(124,58,237,.08)'}}>
        <div style={{maxWidth:720,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:48}}>
            <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'clamp(1.8rem,4vw,2.8rem)'}}>FAQs</h2>
          </div>
          {faqs.map((f,i)=>(
            <div key={i} style={{marginBottom:8}}>
              <button onClick={()=>setFaqOpen(faqOpen===i?null:i)} style={{width:'100%',textAlign:'left',padding:'18px 20px',borderRadius:12,background:'#111118',border:`1px solid ${faqOpen===i?'rgba(124,58,237,.4)':'#1e1e2d'}`,color:'#fff',fontSize:14,fontWeight:500,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',transition:'border-color .2s'}}>
                {f.q}<span style={{color:'#7c3aed',fontSize:20,flexShrink:0,marginLeft:12}}>{faqOpen===i?'−':'+'}</span>
              </button>
              {faqOpen===i&&<div style={{padding:'14px 20px',background:'rgba(124,58,237,.04)',borderRadius:'0 0 12px 12px',fontSize:13,color:'rgba(226,226,240,.6)',lineHeight:1.75,border:'1px solid rgba(124,58,237,.18)',borderTop:'none'}}>{f.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{padding:'80px 5%',textAlign:'center',background:'linear-gradient(135deg,rgba(124,58,237,.07),rgba(240,180,41,.04))'}}>
        <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'clamp(1.8rem,4vw,2.8rem)',marginBottom:12,lineHeight:1.2}}>
          Get Professional AI Product Photos<br/>
          <span style={{color:'#f0b429'}}>in 60 Seconds</span> — Without a Studio.
        </h2>
        <div style={{display:'flex',gap:14,justifyContent:'center',marginTop:28,flexWrap:'wrap'}}>
          <Link to="/register" style={{padding:'14px 36px',borderRadius:12,background:'linear-gradient(135deg,#7c3aed,#6d28d9)',color:'#fff',textDecoration:'none',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1rem',display:'inline-flex',alignItems:'center',gap:8}}>
            Start Creating Free <ArrowRight size={18}/>
          </Link>
        </div>
        <div style={{display:'flex',gap:18,justifyContent:'center',marginTop:18,flexWrap:'wrap'}}>
          {['✓ Free HD Download','✓ No Watermark','✓ No Studio Needed'].map(t=><span key={t} style={{fontSize:13,color:'rgba(162,140,250,.45)'}}>{t}</span>)}
        </div>
      </section>

      {/* Footer */}
      <footer style={{padding:'40px 5% 24px',borderTop:'1px solid rgba(124,58,237,.1)',background:'#0d0d15'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:28,maxWidth:1100,margin:'0 auto 28px'}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
              <div style={{width:26,height:26,borderRadius:7,background:'linear-gradient(135deg,#7c3aed,#4c1d95)',display:'flex',alignItems:'center',justifyContent:'center'}}><Sparkles size={13} color="#fff"/></div>
              <span style={{fontFamily:'Syne,sans-serif',fontWeight:700,color:'#fff',fontSize:'.95rem'}}>ClothVision AI</span>
            </div>
            <p style={{fontSize:12,color:'rgba(162,140,250,.38)',lineHeight:1.65}}>AI-powered photoshoot creation for fashion brands and e-commerce sellers.</p>
          </div>
          {[
            {title:'Quick Links',links:['Home','Features','How It Works','Pricing','FAQs']},
            {title:'Studio',links:['Fashion Try-On','Scene Builder','Video Studio','Label Creator','360° View','Marketing Poster']},
            {title:'Legal',links:['Terms & Conditions','Privacy Policy','Refund Policy','Disclaimer']},
          ].map(col=>(
            <div key={col.title}>
              <p style={{fontFamily:'Syne,sans-serif',fontWeight:600,color:'#fff',marginBottom:12,fontSize:13}}>{col.title}</p>
              {col.links.map(l=><a key={l} href="#" style={{display:'block',fontSize:12,color:'rgba(162,140,250,.38)',textDecoration:'none',marginBottom:7,transition:'color .2s'}}
                onMouseEnter={e=>e.target.style.color='#a78bfa'} onMouseLeave={e=>e.target.style.color='rgba(162,140,250,.38)'}>{l}</a>)}
            </div>
          ))}
        </div>
        <div style={{borderTop:'1px solid rgba(124,58,237,.08)',paddingTop:18,textAlign:'center',fontSize:12,color:'rgba(162,140,250,.25)'}}>
          © 2026 ClothVision AI. All rights reserved. Powered by Gemini AI.
        </div>
      </footer>
    </div>
  );
}
