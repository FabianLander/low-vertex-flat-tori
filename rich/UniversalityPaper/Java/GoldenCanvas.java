import java.awt.*;
import java.awt.event.*;
import java.awt.geom.*;
import java.math.*;
import java.util.Arrays;
import java.util.Comparator;


public class GoldenCanvas extends ScaleCanvas implements MouseListener, KeyListener, MouseMotionListener {
    Manager M;
    boolean alive;
    int[][] EYE=new int[16][16];
    Complex[] Z=new Complex[100000];
    SelectInteger PATH;
    int COUNT=0;
    ListenSquare CONTROL,CONTROL2;
    Lever SCALE;
    Lever APPROX;
    int MARKER;
    int DRAG;


     public GoldenCanvas() {
	 addKeyListener(this);
	 addMouseListener(this);
	 addMouseMotionListener(this);
	 setScales(120,880,550);
	 alive=true;
	 SOURCE=new Complex(.25,1);
	 CONTROL=new ListenSquare(0,0,0,70);
	 CONTROL2=new ListenSquare(0,70,90,0);
	 SCALE=new Lever(0,0,8,19);
	 APPROX=new Lever(185,40,0,2);
	 PATH=new SelectInteger(260,40,40,20,4,1,20,1);
	 MARKER=800;
	 DRAG=0;
     }

   public void paint(Graphics g2) {
      Graphics2D g=(Graphics2D) g2;
      g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);
      drawBG(g);
      drawDomain(g);
      drawScale(g);
      drawControls(g);
      drawPathParameter(g);
   }

    public void drawBG(Graphics2D g) {
	g.setColor(new Color(0,0,255));
	g.setColor(Color.white);
        g.fillRect(0,0,getWidth(),getHeight());
    }

    
    public void drawControls(Graphics2D g) {
	CONTROL2.h=this.getHeight()-71;
	CONTROL.w=this.getWidth();
	CONTROL.render(g,Color.black);
	CONTROL2.render(g,Color.black);
	g.setColor(Color.white);
	g.setFont(new Font("Helvetica",Font.PLAIN,14));
	Double D1=Double.valueOf(SOURCE.x);
	Double D2=Double.valueOf(SOURCE.y);
	g.drawString(D1.toString(),5,40);
	g.drawString(D2.toString(),5,56);
	if(APPROX.val==1) {
	   g.drawString("approx",(int)(PATH.x),(int)(PATH.y)-5);
	   PATH.render(g,Color.blue,Color.white,Color.white);
	}
	APPROX.render(g,Color.blue,"path n/y");
	SCALE.render(g,Color.red,"");
    }

    

    public void drawPathParameter(Graphics2D g) {
	Path2D.Double p=new Path2D.Double();
	g.setColor(Color.red);
	g.fillRect(0,MARKER,90,this.getHeight()-MARKER);
	g.setColor(Color.white);
	g.drawRect(0,MARKER,90,this.getHeight()-MARKER);
	g.setColor(Color.white);
	g.setFont(new Font("Helvetica",Font.PLAIN,14));
	BigDecimal D=BigDecimal.valueOf(getParameter());
	String S=D.toString();
	try{
	S=S.substring(1,12);
	}
	catch(Exception e) {}
	g.drawString(S,3,MARKER);
	

    }

    public void drawDomain(Graphics2D g) {
	Color COL=Color.black;
	Path2D.Double p=new Path2D.Double();
	p.moveTo(0,0);
	p.lineTo(0,100);
	p.lineTo(.5,100);
	p.lineTo(.5,0);
	p.closePath();
	p=transform(p);
	g.setColor(Color.black);
	g.setColor(new Color(255,200,0));
	g.fill(p);
	g.setColor(Color.white);
	g.draw(p);
	fillPoint(g,new Complex(1,0),1,Color.white,COL,200);
	fillPoint(g,new Complex(0,0),1,new Color(0,0,0,0),COL,200);
	fillPoint(g,new Complex(.5,0),.5,new Color(0,0,0,0),COL,200);
	p.reset();

	p.moveTo(-10,0);
	p.lineTo(+10,0);
	p.lineTo(+10,-10);
	p.lineTo(-10,-10);
	p.closePath();
	p=transform(p);
       	g.setColor(new Color(200,200,200));
       	g.fill(p);
       	g.setColor(Color.white);
       	g.draw(p);

	p.reset();
	p.moveTo(1,0);
	p.lineTo(1,20);
	p=transform(p);
	g.setColor(Color.white);
	g.draw(p);

	p.reset();
	p.moveTo(0,0);
	p.lineTo(0,100);
	p=transform(p);
	g.setColor(Color.black);
	g.draw(p);

	double s=Math.sqrt(3)/2;
	p.reset();
	p.moveTo(.5,s);
	p.lineTo(.5,100);
	p=transform(p);
	g.setColor(Color.black);
	g.draw(p);
	

	for(int i=2;i<8;++i) {
	double t=Math.pow(.25,i);
	fillPoint(g,SOURCE,.9*t,new Color(0,0,0,0),Color.white,64);
	fillPoint(g,SOURCE,t,new Color(0,0,0,0),Color.black,64);
	}
    }


    public void drawScale(Graphics2D g) {
	int v=SCALE.val;
	if(v>5) return;
	double s=Math.pow(.5,v+2);
	Path2D.Double p=new Path2D.Double();
	
	for(int i=0;i<1024;++i) {
	    p.moveTo(0,s*i);
	    p.lineTo(.5,s*i);
	}

	for(int i=0;i<.5/s;++i) {
	    p.moveTo(s*i,0);
	    p.lineTo(s*i,32);
	}

	
	p=transform(p);
	g.setColor(new Color(0,0,0,100));
	g.draw(p);
    }
	
    
    public void mouseClicked(MouseEvent e) { 
	MouseData J=MouseData.process(e);
	if(CONTROL.inside(J.X)==1) {
	    doControls(J.X);
	    repaint();
	    return;
	}
        if(J.mode==1)  scaleUp(J.X,0);
        if(J.mode==3)  scaleUp(J.X,1);
	if(J.mode==2)  SOURCE=unTransform(J.X);
	SOURCE=coerce(SOURCE);
	try{M.N.T[0]=PaperTorus.diamond(SOURCE);} catch(Exception ee) {}
	M.repaint();
    }

    public void mouseDragged(MouseEvent e) { 
   	MouseData J=MouseData.process(e);
	
	if(DRAG==2) {
	    doControls2(J.X);
	    repaint();
	    return;
	}

	
	if(J.mode==2)  SOURCE=unTransform(J.X);
	SOURCE=coerce(SOURCE);
	try{
	    M.N.T[0]=PaperTorus.diamond(SOURCE);
            M.N.T[1]=PaperTorus.shape();
     	    M.N.T[1]=PaperTorus.align(3,M.N.T[0],M.N.T[1]);
	}
        catch(Exception ee) {}
	M.repaint();
    }
    
     public void mouseReleased(MouseEvent e) {
	 DRAG=0;
     }

     public void mousePressed(MouseEvent e) {
	MouseData J=MouseData.process(e);
	if(CONTROL2.inside(J.X)==1) DRAG=2;
	else DRAG=0;
     }


    
     public void mouseEntered(MouseEvent e) {}
     public void mouseExited(MouseEvent e) {}   

    public void mouseMoved(MouseEvent e) {}



    public Complex coerce(Complex z) {
	double t=Math.pow(2,-20);
	Complex w=coerce0(z);;
	w=coerce1(w);
	if(w.x<t) w.x=t;
	if(w.x>.5-t) w.x=.5-t;
	return w;
    }

    public  Complex coerce0(Complex z) {
	double t=Math.pow(2,-20);
	double s=Math.pow(2,SCALE.val+2);
	double x=Math.floor(z.x*s+.5)/s;
	double y=Math.floor(z.y*s+.5)/s;
	return new Complex(x,y);
    }


    public static Complex coerce1(Complex z) {
	double t=Math.pow(2,-20);
	double test=Complex.dist(z,new Complex(1,0));
	if(test>1+t) return z;
     	Complex u=Complex.minus(z,new Complex(1,0));
	u=u.unit();
	u=u.scale(1+t);
	Complex w=Complex.plus(new Complex(1,0),u);
	return w;
    }

    

    public void keyTyped(KeyEvent e) {
        if (M.C.T == null) return;
        char ch = e.getKeyChar();
	boolean used=false;

	if(ch==' ') {
	    try {
		M.S.LAT_CHOICE=(M.S.LAT_CHOICE+1)%3;
	    }
	    catch(Exception ee) {}
	}
	
	if(ch=='r') {
	    used=true;
	    SOURCE=new Complex(.25,1);
	}
	
	
	if(ch=='t') {
	    used=true;
	    SOURCE=new Complex(1.0/3,3.0/2);
	}
	
	if(ch=='g') {
	    SOURCE=PaperTorus.goldenParameter();
	    used=true;
	}

	if(used==true) {
	    try{
		M.N.T[0]=PaperTorus.diamond(SOURCE);
     	        M.N.T[1]=PaperTorus.shape();
    	        M.N.T[1]=PaperTorus.align(3,M.N.T[0],M.N.T[1]);
	    }
	    catch(Exception ee) {}
	}

        M.repaint();
    }

    public void keyPressed(KeyEvent e) {}

    public void keyReleased(KeyEvent e) {}


    public void doControls(Point X) {
	SCALE.process(X);
	APPROX.process(X);
	PATH.modify(X);
	M.repaint();
    }
    
    public void doControls2(Point X) {
	MARKER=X.y;
	M.repaint();
    }

    public double getParameter() {
	double x=getHeight()-MARKER;
	x=1.0*x/getHeight();
        double t=Math.pow(.5,PATH.val);
	return t*x;
    }
       
    
}
