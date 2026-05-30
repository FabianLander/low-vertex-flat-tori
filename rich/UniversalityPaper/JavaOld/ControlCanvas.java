import java.awt.*;
import java.awt.event.*;
import java.awt.geom.*;
import java.math.*;
import java.util.Arrays;


public class ControlCanvas extends ScaleCanvas implements MouseListener, MouseMotionListener {
    Manager M;
    SelectColor CS;
    ControlPanel ACTION,RESET_COLOR,THREAD,CHOICE;
    ControlPanelColor DISPLAY;
    ListenSquare PRINT,TEST,COLORS,GO,STOP;
    SelectInteger TET;
    boolean started;
    Lever SPEED;
    PopupManager POP;
    ListenSquare[] TRI=new ListenSquare[16];
    Color[] COL=new Color[16];
    Torus T;
    Evolver EVO;
    String MESSAGE;
   
     public ControlCanvas() {
	 addMouseListener(this);
	 addMouseMotionListener(this);
	 CS=new SelectColor(M,0,319,549,50);
	 TEST=new ListenSquare(150,85,50,25);
	 GO=new ListenSquare(200,250,50,25);
	 STOP=new ListenSquare(300,250,50,25);
	 SPEED=new Lever(200,230,8,20);
	 setPanels();
	 started=false;

	 
	 setColorControl();
	 EVO=new Evolver();
	 EVO.halt=true;
  	 T=PaperTorus.shape();
	 MESSAGE="text message will appear in this window";
	 TET=new SelectInteger(300,200,80,40,0,0,70,1);
     }

    public void setColorControl() {

	int[][] p={
	    {555,25},
	    {515,25},
	    {475,75},
	    {475,25},
	    {555,0},
	    {515,0},
	    {595,25},
	    {515,50},
	    {555,50},
	    {595,50},
	    {515,75},
	    {475,0},
	    {555,75},
	    {475,50},
	    {435,25},
	    {435,50}
	};

	for(int i=0;i<16;++i) {
	    TRI[i]=new ListenSquare(p[i][0]-100,p[i][1]+5,25,24);
	}
	resetCandycane();
    }

    public void colorRender(Graphics2D g) {
    String[] f = {
        "753", "307", "435", "031", "342",
        "213", "715", "470", "746", "617",
        "564", "125", "652", "024", "160", "206"
    };
    for (int i = 0; i < 16; ++i) TRI[i].render(g, COL[i], f[i]);
    }
    
    public void setPanels() {

       Color[] C0={new Color(100,150,255),
                   Color.white,
                   Color.white,
                   Color.black,
                   Color.white};
       
       Color[] C1={new Color(0,160,0),
                   Color.white,
                   Color.white,
                   Color.white,
                   Color.white};
       
       String[] DisplayString={"background",
			       "triangle edges",
			       "vertices",
			       "display"};
       
       Color[] DisplayColor={new Color(0,0,40),
			     Color.black,
			     Color.black};
       
	   int[] DisplayState={1,1,1};
       DISPLAY=new ControlPanelColor(C0,DisplayString,DisplayState,3,DisplayColor);

       
       String[] ActionString={"torus",
			      "geometry",
			      "Jacobian",
			       "tests"};
       
       int[] ActionState={1,0,0,0,0};
       ACTION=new ControlPanel(C0,ActionString,ActionState,3);

       
       String[] ColorsString={"all white",
			      "all black",
			      "all one color",
			      "exterior t's",
			      "random light",
			      "order 2 symm",
			      "cylinder division",
			      "candycane",
			      "color reset"};

       int[] ColorsState={1,1,1,1,1,1,1,1};
       RESET_COLOR=new ControlPanel(C0,ColorsString,ColorsState,8);


       String[] ThreadString={"slicer","newton","coeffs","action"};
       int[] ThreadState={0,0,1};
       THREAD=new ControlPanel(C1,ThreadString,ThreadState,3);
       THREAD.forceMode(2);
       
       String[] ChoiceString={"basic best","basic classic","golden valley","newton","torus choice"};
       int[] ChoiceState={1,0,0,0};
       CHOICE=new ControlPanel(C0,ChoiceString,ChoiceState,4);
       CHOICE.forceMode(0);
       
    }
    

   public void paint(Graphics g2) {
      Graphics2D g=(Graphics2D) g2;
      g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);
      drawBG(g);
      drawControls(g);
      drawMessage(g);
   }
    public void drawBG(Graphics2D g) {
	g.setColor(new Color(155,0,200));
        g.fillRect(0,0,getWidth(),getHeight()); 
    }

    public void drawMessage(Graphics2D g) {
	g.setColor(Color.black);
	g.fillRect(110,285,430,30);
	g.setColor(Color.white);
	g.drawRect(110,285,430,30);
	g.setColor(Color.white);
	 g.setFont(new Font("Helvetica",Font.PLAIN,16));
	 g.setColor(Color.white);
	g.drawString(MESSAGE,120,305);
    }
    
    public void drawControls(Graphics2D g) { 
      CS.render(g);
      DISPLAY.render(g,0,0,115);
      ACTION.render(g,120,0,100);
      CHOICE.render(g,0,70,115);
      RESET_COLOR.render(g,225,0,100);
      THREAD.render(g,120,210,70);
      POP.render(g);
      colorRender(g);
      TEST.render(g,new Color(90,160,255),"test");

      if(THREAD.mode==0) { 
        SPEED.render(g,new Color(0,180,0),"animation speed");
        if(EVO.halt==true) GO.render(g,new Color(0,180,0),"slicer: go");
        if(EVO.halt==false) STOP.render(g,new Color(180,0,0),"slicer: stop");
      }

      if(THREAD.mode==1) {
        if(EVO.halt==true) GO.render(g,new Color(0,180,0),"newton: go");
        if(EVO.halt==false) STOP.render(g,new Color(180,0,0),"newton: stop");
      }

      if(THREAD.mode==2) {
        if(EVO.halt==true) GO.render(g,new Color(0,180,0),"coeffs: go");
        if(EVO.halt==false) STOP.render(g,new Color(180,0,0),"coeffs: stop");
      }
      
      
      //TET.render(g,Color.red,Color.white,Color.white);
      
    }

    
    
    public void mouseClicked(MouseEvent e) {
        CS.process(e); 
        MouseData J=MouseData.process(e);
	DISPLAY.process(J.X,CS.C);
	ACTION.switchMode(J.X);
	THREAD.switchMode(J.X);
	makeTorusChoice(J.X);
	SPEED.process(J.X);
	if(GO.inside(J.X)==1) doGo();
	if(STOP.inside(J.X)==1) EVO.halt=true;
	doRecolor(J.X);
	if(TEST.inside(J.X)==1) Tester.main(this.M);
	POP.process(J.X);
	TET.modifyCyclic(J.X);
        M.repaint();
    }




    public static Vector rot(Vector V) {
	double s=1.0/Math.sqrt(2);
	Vector W=new Vector(V.x[0],s*V.x[1]-s*V.x[2],s*V.x[1]+s*V.x[2]);
	return W;
    }
    

    public void mousePressed(MouseEvent e) {
       MouseData J=MouseData.process(e);
       repaint();
    }

	
     public void mouseReleased(MouseEvent e) {}
     public void mouseEntered(MouseEvent e) {
     requestFocus();
     }


	 
     public void mouseExited(MouseEvent e) {}   
     public void mouseMoved(MouseEvent e) {
     }

	 
     public void mouseDragged(MouseEvent e) {
        CS.process(e); 
        MouseData J=MouseData.process(e);
	M.repaint();
     }
    


    public void doRecolor(Point X) {
	int t=RESET_COLOR.getValue(X);
	if(t==0) reset(Color.white,new Color(220,220,220));
	if(t==1) reset(Color.black,new Color(40,40,40));
	if(t==2) reset(CS.C,Color.black);
	if(t==3) resetCanonical();
	if(t==4) COL=ColorManager.colorLight(16);
	if(t==5) resetSymmetric();
	if(t==6) resetDivision();
	if(t==7) resetCandycane();
	for(int i=0;i<16;++i) {
	    if(TRI[i].inside(X)==1) {
		COL[i]=CS.C;
	    }
	}
    }

    public void reset(Color C1,Color C2) {
	for(int i=0;i<16;++i) COL[i]=C1;
	DISPLAY.M[1].C=C2;
    }

    public void resetCanonical() {
	for(int i=0;i<16;++i) COL[i]=Color.white;
        int[] t={0,1,6,7,13,15};
        for(int i=0;i<6;++i) COL[t[i]]=new Color(0,100,255);
	DISPLAY.M[1].C=Color.black;
    }


    public void resetDivision() {
	Color[] C={new Color(150,0,0),new Color(0,0,255),new Color(255,180,0),Color.yellow};
	for(int i=0;i<16;++i) COL[i]=Color.white;
	int[] t={0,1,2,0,3,2,1,0,1,0,3,3,2,1,1,0};
        for(int i=0;i<16;++i) COL[i]=C[t[i]];
	DISPLAY.M[1].C=Color.black;
    }

    public void resetSymmetric() {
	int[] t={1,1,0,1,1,1,1,0,0,0,0,1,0,0,1,0};
	Color[] C={new Color(255,150,255),new Color(50,120,255)};
	for(int i=0;i<16;++i) COL[i]=C[t[i]];
	DISPLAY.M[1].C=Color.black;
    }

    public void resetCandycane() {
	int[] t={3,3,2,0,2,0,0,3,0,1,0,4,4,3,1,0};
	Color[] C={Color.white,Color.yellow,new Color(255,0,0),new Color(180,0,0),new Color(40,80,255)};
	for(int i=0;i<16;++i) COL[i]=C[t[i]];
	DISPLAY.M[1].C=Color.black;
    }

    public void doGo() {
	EVO=new Evolver(this.M);
	new Thread(EVO).start();
    }

    public String toString(int[] L) {
	Arrays.sort(L);
	String S="";
	for(int i=0;i<L.length;++i) {
	    Integer I=Integer.valueOf(L[i]);
	    S=S+I.toString();
	}
	return S;
    }


    public void makeTorusChoice(Point X) {
	
	int t=CHOICE.switchMode(X);
	
	if((t==2)&&(M.platinumCanvasAlive()==false)) {
	    CHOICE.forceMode(0);
	    MESSAGE="open golden window";
	}
	
	if((t==3)&&(M.newtonCanvasAlive()==false)) {
	    CHOICE.forceMode(0);
	    MESSAGE="open Newton and golden windows";
	}
    }

    public Torus getTorus() {
   	if(CHOICE.mode==0) return PaperTorus.shape();
   	if(CHOICE.mode==1) return PaperTorus.shapeClassic();
	if(CHOICE.mode==2) {
	    if(M.X.APPROX.val==0) return PaperTorus.diamond(M.X.SOURCE);
	    return PaperTorus.diamond(M.X.SOURCE,M.X.getParameter());
	}
	if(CHOICE.mode==3) return M.N.T[1];
	return null;
    }

    

    
}

