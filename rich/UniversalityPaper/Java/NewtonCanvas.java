import java.awt.*;
import java.awt.event.*;
import java.awt.geom.*;
import java.math.*;
import java.util.Arrays;


public class NewtonCanvas extends ScaleCanvas implements MouseListener, MouseMotionListener, KeyListener {
    Manager M;
    boolean alive;
    Point JX;
    boolean DRAG;
    ListenSquare CONTROL;
    ControlPanel PROJ,DISPLAY;
    ControlPanelColor POINTS;
    Complex[][] Z=new Complex[2][4];
    Torus[] T=new Torus[2];
    double MOVE;

     public NewtonCanvas() {
	 addMouseListener(this);
	 addMouseMotionListener(this);
	 addKeyListener(this);
	 setScales(220,450,300);
	 alive=true;
	 DRAG=false;
         CONTROL=new ListenSquare(0,0,0,80);
	 MOVE=.5;
	 Complex z=new Complex(.25,1);
	 T[0]=PaperTorus.diamond(z);
	 T[1]=PaperTorus.shape();
	 T[1]=PaperTorus.align(0,T[0],T[1]);
	 setPanels();
     }
    
    
    public void setPanels() {

	Color[] C0={new Color(0,0,200),
                   Color.white,
                   Color.white,
                   Color.white,
                   Color.white};
       
       String[] PointsString={"point 0",
			       "point 1",
			       "point 2",
                               "point 3",
			       "points"};
       
       Color[] PointsColor={Color.white,
			     Color.pink,
			     Color.orange,
			    new Color(180,180,180)};
       
       int[] PointsState={1,1,1,1};
       POINTS=new ControlPanelColor(C0,PointsString,PointsState,4,PointsColor);

       
       String[] ProjString={"XY-plane",
			    "ridge",
			    "projection"};
       
       int[] ProjState={1,0};
       PROJ=new ControlPanel(C0,ProjString,ProjState,2);

       
       String[] DisplayString={"golden",
			    "interior",
			    "which pup"};
       
       int[] DisplayState={1,1};
       DISPLAY=new ControlPanel(C0,DisplayString,DisplayState,2);

    }
    

   public void paint(Graphics g2) {
      Graphics2D g=(Graphics2D) g2;
      g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);
      drawBG(g);
      drawPoints(g);
      drawControls(g);
   }


    public void doTest() {
	System.out.println("----");
	Complex[] z=new Complex[8];
	for(int i=0;i<8;++i) {
	    z[i]=project1(T[0],i);
	    z[i].print();
	}

	Complex t1=Complex.minus(z[3],z[4]);
	Complex t2=Complex.minus(z[3],z[6]);
	Complex t3=Complex.divide(t1,t2);
	double test=t3.norm();
	System.out.println("norm "+test);
    }
	

    public void drawBG(Graphics2D g) {
	g.setColor(Color.black);
        g.fillRect(0,0,getWidth(),getHeight());
	Path2D.Double p=new Path2D.Double();
	p.moveTo(-2,0);
	p.lineTo(+2,0);
	p.moveTo(0,-2);
	p.lineTo(0,+2);
	p=transform(p);
	g.setColor(new Color(200,0,200));
	g.draw(p);

    }

    public void drawPoints(Graphics2D g) {
	drawPoints(g,0,new Color(50,100,255));
	drawPoints(g,1,new Color(80,100,120));
    }
    
    public void drawPoints(Graphics2D g,int choice,Color CC) {
	Color[] C=new Color[8];
	for(int i=0;i<4;++i) {
	    C[i]=POINTS.M[i].C;
	    C[7-i]=C[i];
	}
	int[] on=new int[8];
	for(int i=0;i<4;++i) {
	    on[i]=POINTS.L[i].on;
	    on[7-i]=on[i];
	}
	
	

	double rad=.03;
	if(choice==1) rad=.02;
	int val=DISPLAY.mode;


	for(int i=0;i<8;++i) {
	   Color COL=C[i];
	    if(choice==0) COL=new Color(0,0,0,0);
	    Complex z=project(T[choice],i);
	    if((on[i]==1)&&DISPLAY.L[choice].on==1) fillPoint(g,z,rad,COL,C[i],32);
	}
    }

    public Complex project(Torus T,int i) {
	if(PROJ.mode==0) return project0(T,i);
	return project1(T,i);
    }

    public Complex project0(Torus T,int i) {
       Complex z=new Complex(T.U[i].x[0],T.U[i].x[1]);
       return z;
    }

    public Complex project1(Torus T,int i) {
	int k=3;
	Complex u=new Complex(T.U[k].x[0],-T.U[k].x[1]);
	u=u.unit();
        Complex z=new Complex(T.U[i].x[0],T.U[i].x[1]);
	z=Complex.times(z,u);
	Complex zz=new Complex(z.x,T.U[i].x[2]);
	return zz;
    }
    
    public void drawControls(Graphics2D g) {
	CONTROL.w=this.getWidth();
	CONTROL.render(g,new Color(100,0,200));
	POINTS.render(g,0,0,80);
	PROJ.render(g,85,0,80);
	DISPLAY.render(g,170,0,80);
    }
    
    public void mousePressed(MouseEvent e) {
      	MouseData J=MouseData.process(e);
	repaint();
    }

    
    
    public void doMouseClick(int mode) {
        if(mode==1)  scaleUp(JX,0);
        if(mode==3)  scaleUp(JX,1);
	if(mode==2)  SOURCE=unTransform(JX);
	M.repaint();
    }
    
    public void mouseClicked(MouseEvent e) { 
	MouseData J=MouseData.process(e);
	if(CONTROL.inside(J.X)==1) {
	    doControls(J.X);
	    M.repaint();
	    return;
	}
	
        if(J.mode==1)  scaleUp(J.X,0);
        if(J.mode==3)  scaleUp(J.X,1);
	if(J.mode==2)  {
	    SOURCE=unTransform(J.X);
	    changePoints();
	}
    	M.repaint();
    }

    public void mouseDragged(MouseEvent e) { 
	MouseData J=MouseData.process(e);
	if(CONTROL.inside(J.X)==1) {
            doControls(J.X);
	    M.repaint();
	    return;
	}
	    
	if(J.mode==2)  {
	    SOURCE=unTransform(J.X);
	    changePoints();
	}
	M.repaint();
    }
    
     public void mouseReleased(MouseEvent e) {	 
     }

     public void mouseEntered(MouseEvent e) {}
     public void mouseExited(MouseEvent e) {}   


    public void mouseMoved(MouseEvent e) {
          MouseData J=MouseData.process(e);
	  JX=J.X;
	  if(DRAG==true) SOURCE=unTransform(J.X);
	  M.C.repaint();
     }

    
    
    public void keyPressed(KeyEvent e) {
	DRAG=true;
    }
    public void keyReleased(KeyEvent e) {
	DRAG=false;
    }

    
  public void keyTyped(KeyEvent e) {
      char ch=e.getKeyChar();
      
      //zooming and coloring
      if(ch=='z') doMouseClick(1);
      if(ch=='x') doMouseClick(2);
      if(ch=='c') doMouseClick(3);
      repaint();
  }


    public void doControls(Point X) {
	DISPLAY.toggle(X);
	POINTS.process(X,M.C.CS.C);
	PROJ.switchMode(X);
    }

    public void changePoints() {
	int index=0;
	double min=100;
	for(int i=0;i<4;++i) {
	    double dist=Complex.dist(SOURCE,Z[1][i]);
	    if(dist<min) {
		min=dist;
		index=i;
	    }
	}
	Z[1][index]=new Complex(SOURCE);
    }


    public double[] getRoadParameter() {
	Complex z=new Complex(.1,.5);
	try {
	    z=M.X.SOURCE;
	}
	catch(Exception e) {}
	double[] t={z.x,z.y};
	return t;
    }
}
