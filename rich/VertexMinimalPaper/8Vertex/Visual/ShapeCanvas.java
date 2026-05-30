import java.awt.*;
import java.awt.event.*;
import java.awt.geom.*;
import java.math.*;
import java.util.Arrays;



public class ShapeCanvas extends ScaleCanvas implements MouseListener, MouseMotionListener, KeyListener {
    Manager M;
    Shape T;
    ListenSquare CONTROL;
    Lever COORD;
    ControlPanelColor DISPLAY;
    SelectInteger SHADE,LEVEL,COPY;
    
    double trans;
    int[] FACE = new int[3];
    Point JX;
    boolean alive;
    int  LAT_CHOICE;

    public ShapeCanvas() {
        addMouseListener(this);
        addMouseMotionListener(this);
        addKeyListener(this);              
        setFocusable(true);              
        requestFocusInWindow();         
        setScales(250, 250, 40);
	CONTROL=new ListenSquare(0,0,0,80);
	LAT_CHOICE=0;
	LEVEL=new SelectInteger(140,40,50,25,10,5,200,5);
	SHADE=new SelectInteger(240,40,50,25,60,10,250,10);
	COPY=new SelectInteger(340,40,50,25,4,1,5,1);
	setPanels();
    }



    
    public void setPanels() {

	Color[] C0={new Color(0,0,200),
                   Color.white,
                   Color.white,
                   Color.white,
                   Color.white};
       
       String[] DisplayString={"edges",
			       "foliation",
			       "level set",
                               "orbifold",
			       "display"};
       
       Color[] DisplayColor={new Color(0,0,0),
			     Color.black,
			     Color.black,
			     new Color(0,0,0,0)};
       
       int[] DisplayState={1,0,0,0};
       DISPLAY=new ControlPanelColor(C0,DisplayString,DisplayState,4,DisplayColor);

    }
    
    

    public void paint(Graphics g2) {
        Graphics2D g = (Graphics2D) g2;
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        drawBG(g);
	Torus T=M.C.getTorus();
        drawTiling(g,T);
       	drawFoliation(g,T);
       	drawLevel(g,T);
        drawLattice(g,T);
	drawControls(g);
    }

    public void drawBG(Graphics2D g) {
        g.setColor(M.C.DISPLAY.M[0].C);
        g.fillRect(0, 0, getWidth(), getHeight());
    }

    public void drawControls(Graphics2D g) {
        CONTROL.w = getWidth();
        CONTROL.render(g, new Color(0,0,80));
	DISPLAY.render(g,0,0,120);
	
	LEVEL.render(g,Color.blue,Color.white,Color.white);
        g.setFont(new Font("Helvetica",Font.PLAIN,16));
	g.drawString("# leaves",(int)(LEVEL.x),(int)(LEVEL.y-8));

	SHADE.render(g,Color.blue,Color.white,Color.white);
        g.setFont(new Font("Helvetica",Font.PLAIN,16));
	g.drawString("orbi shade",(int)(SHADE.x),(int)(SHADE.y-8));

	COPY.render(g,Color.blue,Color.white,Color.white);
        g.setFont(new Font("Helvetica",Font.PLAIN,16));
	g.drawString("tiles",(int)(COPY.x),(int)(COPY.y-8));

	
    }

    public void drawTiling(Graphics2D g,Torus T) {
	Complex[][] Z=Tiling.fundamentalDomain(T);
	Complex t1=Tiling.lattice1(T);
	Complex t2=Tiling.lattice2(T);

	int K=COPY.val;
	for(int i=-K+1;i<K;++i) {
	    for(int j=-K+1;j<K;++j) {
	       for(int k=0;k<16;++k) {
		   Complex[] W=Tiling.translate(Z[k],t1,t2,i,j);
      	           renderTriangle(g,W);
	       }
	    }
	}
    }


    
    public void drawFoliation(Graphics2D g,Torus T) {
	if(DISPLAY.L[1].on==0) return;
	try {double[] b=M.E.getLevelBounds(T);} catch(Exception e) {return;}
	Complex[][] Z=Tiling.fundamentalDomain(T);
	Complex t1=Tiling.lattice1(T);
	Complex t2=Tiling.lattice2(T);
	int K=COPY.val;
	for(int i=-K+1;i<K;++i) {
	    for(int j=-K+1;j<K;++j) {
	       for(int k=0;k<16;++k) {
		   Complex[] W=Tiling.translate(Z[k],t1,t2,i,j);
	           drawFoliation(g,W,T);
	       }
	    }
	}
    }

    public void drawFoliation(Graphics2D g,Complex[] Z,Torus T) {
	Path2D.Double p=new Path2D.Double();
	Matrix m=M.E.getMatrix();
	double[] b=M.E.getLevelBounds(T);
	int[] f=Tiling.extractLabel(Z);
	double[] d=Tiling.assignWeights(m,T,f);
	int L=LEVEL.val;
	for(int i=0;i<=L;++i) {
	    double t=1.0*i/L;
	    double tt=(1-t)*b[0]+t*b[1];
	    Complex[] z=Foliation.leaf(Z,d,tt);
	    try{
  	        p.moveTo(z[0].x,z[0].y);
	        p.lineTo(z[1].x,z[1].y);
	    }
	    catch(Exception e) {}
	}
	p=transform(p);
	g.setColor(DISPLAY.M[1].C);
	g.draw(p);
    }





    public void drawLevel(Graphics2D g,Torus T) {
	if(DISPLAY.L[2].on==0) return;
	try {double[] b=M.E.getLevelBounds(T);} catch(Exception e) {return;}
	Complex[][] Z=Tiling.fundamentalDomain(T);
	Complex t1=Tiling.lattice1(T);
	Complex t2=Tiling.lattice2(T);
	for(int i=-3;i<=3;++i) {
	    for(int j=-3;j<3;++j) {
	       for(int k=0;k<16;++k) {
		   Complex[] W=Tiling.translate(Z[k],t1,t2,i,j);
	           drawLevel(g,W,T);
	       }
	    }
	}
    }

    public void drawLevel(Graphics2D g,Complex[] Z,Torus T) {
	Path2D.Double p=new Path2D.Double();
	Matrix m=M.E.getMatrix();
	double[] b=M.E.getLevelBounds(T);
	try {
	    b[0]=M.T.slice;
	}
        catch(Exception e) {return;}
	int[] f=Tiling.extractLabel(Z);
	double[] d=Tiling.assignWeights(m,T,f);
	int L=LEVEL.val;
	double tt=b[0];
	Complex[] z=Foliation.leaf(Z,d,tt);
	if(z!=null) {
	   if(z.length==2) {
 	      p.moveTo(z[0].x,z[0].y);
	      p.lineTo(z[1].x,z[1].y);
	   }
	}
	p=transform(p);
	g.setStroke(new BasicStroke(3));
	g.setColor(DISPLAY.M[2].C);
	g.draw(p);
	g.setStroke(new BasicStroke(1));
    }

    public void drawLattice(Graphics2D g,Torus T) {
	if(DISPLAY.L[3].on==0) return;
	Complex t0=Tiling.symmetryPoint(T);
	Complex t1=Tiling.lattice1(T);
	Complex t2=Tiling.lattice2(T);
	
	t1=t1.scale(.5);
	t2=t2.scale(.5);
	if(LAT_CHOICE==1) t2=Complex.minus(t2,t1); 
      	if(LAT_CHOICE==2) t1=Complex.minus(t2,t1);
	for(int i=-5;i<=5;++i) {
	    for(int j=-5;j<=5;++j) {
		Complex tt1=Complex.plus(t1,t0);
		Complex tt2=Complex.plus(t2,t0);
  		renderParallelogram(g,t0,t1,t2,i,j);
	    }
	}

    }

    public void renderParallelogram(Graphics2D g,Complex t0,Complex t1,Complex t2,int m1,int m2) {
	Path2D.Double p=new Path2D.Double();
	Complex t=Complex.plus(t1.scale(m1),t2.scale(m2));
	t=Complex.plus(t,t0);
	p.moveTo(t.x,t.y);
	p.lineTo(t.x+t1.x,t.y+t1.y);
	p.lineTo(t.x+t1.x+t2.x,t.y+t1.y+t2.y);
	p.lineTo(t.x+t2.x,t.y+t2.y);
	p.closePath();
	p=transform(p);
	int a=SHADE.val;
	Color[] COL={new Color(255,255,255,a),new Color(0,0,0,a)};
	int n=(100+m1+m2)%2;
	g.setColor(COL[n]);
	g.fill(p);
	g.setStroke(new BasicStroke(2));
	g.setColor(DISPLAY.M[3].C);
	g.draw(p);
	g.setStroke(new BasicStroke(1));
    }
    
    
    public void renderTriangle(Graphics2D g,Complex[] Z) {
	int[] f=Tiling.extractLabel(Z);
	int t=TriangulationCombinatorics.lookup(f);
	Color C=M.C.COL[t];
	Path2D.Double p=new Path2D.Double();
	for(int i=0;i<3;++i) {
	    if(i==0) p.moveTo(Z[i].x,Z[i].y);
	    else p.lineTo(Z[i].x,Z[i].y);
	}
	p.closePath();
	p=transform(p);
	g.setColor(C);
	g.fill(p);
	g.setColor(DISPLAY.M[0].C);
	g.draw(p);
    }

    
    public void mousePressed(MouseEvent e) {}

    public void doMouseClick(int mode) {
	if(CONTROL.inside(JX)==1) {
	    doControls(JX);
	    repaint();
	    return;
	}
        if (mode == 1) scaleUp(JX, 0);
        if (mode == 3) scaleUp(JX, 1);
        if (mode == 2) {
            SOURCE = unTransform(JX);
        }
        M.repaint();
    }

    public void mouseClicked(MouseEvent e) {
        MouseData J = MouseData.process(e);
	if(CONTROL.inside(J.X)==1) {
	    doControls(J.X);
	    repaint();
	    return;
	}
        if (J.mode == 1) scaleUp(J.X, 0);
        if (J.mode == 3) scaleUp(J.X, 1);
        if (J.mode == 2) {
            SOURCE = unTransform(J.X);
        }
        M.repaint();
    }

    public void mouseDragged(MouseEvent e) {
        MouseData J = MouseData.process(e);
        if (J.mode == 2) {
            SOURCE = unTransform(J.X);
        }
        M.repaint();
    }

    public void mouseReleased(MouseEvent e) {}

    public void mouseEntered(MouseEvent e) {
        requestFocus();
    }

    public void mouseExited(MouseEvent e) {}

    public void mouseMoved(MouseEvent e) {
	MouseData J = MouseData.process(e);
	JX=J.X;
	
    }

    public void keyTyped(KeyEvent e) {
        if (M.C.T == null) return;
        char ch = e.getKeyChar();
	if(ch=='z') doMouseClick(1);
	if(ch=='x') doMouseClick(2);
	if(ch=='c') doMouseClick(3);
	if(ch==' ') LAT_CHOICE=(LAT_CHOICE+1)%3;
        M.repaint();
    }

    public void keyPressed(KeyEvent e) {}

    public void keyReleased(KeyEvent e) {}

    public void doControls(Point X) {
	DISPLAY.process(X,M.C.CS.C);
	LEVEL.modify(X);
	SHADE.modify(X);
	COPY.modify(X);

    }

}
