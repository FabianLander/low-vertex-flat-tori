import java.awt.*;
import java.awt.event.*;
import java.awt.geom.*;
import java.math.*;
import java.util.Arrays;


public class ControlCanvas extends ScaleCanvas implements MouseListener, MouseMotionListener {
    Manager M;
    SelectColor CS;
    SelectInteger CHOICE;
    ControlPanelColor DISPLAY;
    ControlPanel FILTER,DEBUG;
    ListenSquare COMPUTE,GET1,GET2,DEB;
    int[] PATTERNS=new int[15504];
    int COUNT;

     public ControlCanvas() {
	 addMouseListener(this);
	 addMouseMotionListener(this);
	 CS=new SelectColor(M,0,178,499,50);
	 GET1=new ListenSquare(110,120,20,20);
	 GET2=new ListenSquare(110,145,20,20);
	 DEB=new ListenSquare(300,0,20,20);
	 COMPUTE=new ListenSquare(0,150,20,20);
	 CHOICE=new SelectInteger(190,145,40,20,0,0,0,1);
	 COUNT=0;
	 setPanels();
	 compute();
     }

   public void paint(Graphics g2) {
      Graphics2D g=(Graphics2D) g2;
      g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);
      drawBG(g);
      drawControls(g);
      drawCount(g);
   }

    
    public void setPanels() {

       Color[] C0={new Color(100,150,255),
                   Color.white,
                   Color.white,
                   Color.black,
                   Color.white};

       
       String[] DisplayString={"external triangles",
			       "hexagons",
			       "vertices",
			       "edges",
			       "internal triangles",
			       "display"};
       
       Color[] DisplayColor={new Color(255,100,255),
			     Color.blue,
			     new Color(50,100,255),
			     Color.black,
			     Color.white};
       
       int[] DisplayState={1,0,1,1,1};
       DISPLAY=new ControlPanelColor(C0,DisplayString,DisplayState,5,DisplayColor);

       String[] FilterString={"0","1","2","3","4","5","6","test which links?"};

       int[] FilterState={0,0,0,0,0,0,0};
       FILTER=new ControlPanel(C0,FilterString,FilterState,7);

       
       String[] DebugString={"internal edges",
			     "internal faces",
			      "links",
			      "cycle test (filtered)",
			     "cycle test(absolute)",
			     "debugger"};

       int[] DebugState={1,0,0,0,0,0};
       DEBUG=new ControlPanel(C0,DebugString,DebugState,5);
    }
    

    public void drawBG(Graphics2D g) {
	g.setColor(new Color(155,0,200));
        g.fillRect(0,0,getWidth(),getHeight()); 
    }
    
    public void drawControls(Graphics2D g) { 
      CS.render(g);
      GET1.render(g,new Color(0,220,0),"get random");
      GET2.render(g,new Color(0,160,0),"get listed");
      DEB.render(g,new Color(0,100,255),"debug");
      COMPUTE.render(g,new Color(130,0,150),"compute");
      DEBUG.render(g,375,0,120);
      DISPLAY.render(g,110,0,140);
      FILTER.render2(g,0,0,100);
      CHOICE.render(g,new Color(0,160,0),Color.white,Color.white);
    }

    public void drawCount(Graphics2D g) {
        g.setFont(new Font("Helvetica",Font.PLAIN,18));
	g.setColor(Color.white);
	Integer c=Integer.valueOf(COUNT);
	g.drawString(c.toString(),300,145);
	g.drawString("# surviving patterns:",300,125);
    }
    
    
    public void mouseClicked(MouseEvent e) {
        CS.process(e); 
        MouseData J=MouseData.process(e);
	int t=DISPLAY.process(J.X,CS.C);
	if(t!=-1) M.repaint();

	FILTER.toggle(J.X);
	CHOICE.modify(J.X);
	DEBUG.switchMode(J.X);
	if(DEB.inside(J.X)==1) debug();
	if(CHOICE.isModified(J.X)==1) getListed();
	if(COMPUTE.inside(J.X)==1) compute(); 
	if(GET1.inside(J.X)==1) getRandom(); 
	if(GET2.inside(J.X)==1) getListed();
        repaint();
    }

    public void mousePressed(MouseEvent e) {}
     public void mouseReleased(MouseEvent e) {}
     public void mouseEntered(MouseEvent e) {}
     public void mouseExited(MouseEvent e) {}   
     public void mouseMoved(MouseEvent e) {}    
    public void mouseDragged(MouseEvent e) {}



    

    /**These get examples of patterns which pass the given tests*/

    public void getRandom() {
	if(COUNT==0) return;
	int r=(int)(COUNT*Math.random());
	getExample(r);
    }

    public void getListed() {
	if(COUNT==0) return;
	int r=CHOICE.val;
	getExample(r);
    }

    public void getExample(int r) {
	if(COUNT==0) return;
   	int[][] t=LinkAnalyzer.internalFaces(PATTERNS[r]);
	int pr=PATTERNS[r];
	M.P.PATTERN=pr;
	M.P.repaint();
    }

    

    /**This computes all internal edge patterns with the given filter*/
    
    public void compute() {
	int count=0;
	int[] f=new int[7];
	for(int i=0;i<7;++i) f[i]=FILTER.L[i].on;

	for(int i=0;i<15504;++i) {
  	    if(LinkAnalyzer.mainTest(f,i)==true) {
		PATTERNS[count]=i;
		++count;
	    }
	}
	COUNT=count;
	CHOICE.val=0;
	CHOICE.max=count-1;
    }

    /**This final routine runs the main test*/
    
    public void wrapper() {
	int count=0;
	int[] f={1,1,1,1,1,1,1};

	for(int i=0;i<15504;++i) {
  	    if(LinkAnalyzer.mainTest(f,i)==true) {
		PATTERNS[count]=i;
		++count;
	    }
	}
	System.out.println("count (should be 0) "+count);
    }

    /**debugging*/

    public void debug() {
	int m=DEBUG.mode;
	Debugger.debug(this.M,m);
    }
    


}

