import java.awt.*;
import java.awt.event.*;
import java.awt.geom.*;
import java.math.*;
import java.util.Arrays;


public class TorusCanvas extends ScaleCanvas implements KeyListener, MouseListener, MouseMotionListener {
    Manager M;
    ListenSquare CONTROL;
    ControlPanel TORUS;
    ControlPanelColor DISPLAY;
    double slice,slice2;
    SelectInteger LINK;
    Point JX;
    boolean alive;
    Torus T;
    

     public TorusCanvas() {
	 addKeyListener(this);
	 addMouseListener(this);
	 addMouseMotionListener(this);
	 setFocusable(true);
	 requestFocusInWindow();
	 setScales(300,300,200);
	 CONTROL=new ListenSquare(0,0,getWidth(),65);
	 LINK=new SelectInteger(230,25,40,20,0,0,8,1);
	 slice=.5;
	 JX=new Point();
	 setPanels();
     }

    
    public void setPanels() {

	Color[] C0={new Color(0,0,200),
                   Color.white,
                   Color.white,
                   Color.white,
                   Color.white};
       

       String[] TorusString={"stars","slices","slicer display"};
       int[] TorusState={1,0};
       TORUS=new ControlPanel(C0,TorusString,TorusState,2);
       TORUS.forceMode(1);


       String[] DisplayString={"handlebody fill",
			       "handlebody outline",
			       "tetration",
			       "display"};
       
       Color[] DisplayColor={new Color(255,255,255,50),
			     new Color(255,180,255),
			     new Color(255,200,0)};
       
       int[] DisplayState={1,0,0};
       DISPLAY=new ControlPanelColor(C0,DisplayString,DisplayState,3,DisplayColor);


       
    }
    


   public void paint(Graphics g2) {
      Graphics2D g=(Graphics2D) g2;
      g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);
         boolean newton=false;
	 Torus T=M.C.getTorus();
          drawBG(g);
	  int mode=TORUS.mode;
	  if(mode==0) drawLink(g,T);
	  if(mode==1) drawSlice(g,T);
	  if(mode==1) drawHandlebody(g,T);
	  if(mode==1) drawTet(g,T);
	  drawControls(g);
   }

    


    
	

    public void drawBG(Graphics2D g) {
	g.setColor(M.C.DISPLAY.M[0].C);
        g.fillRect(0,0,getWidth(),getHeight());
    }

    public Matrix getMatrix() {
	Matrix m=Matrix.rotate(0,0,.5);
	try{m=M.E.getMatrix();}
	catch(Exception e) {}
	return m;
    }

    

    /**link drawing programs*/
    
    public void drawLink(Graphics2D g,Torus T) {
	int count=0;
    	int link=LINK.val;
	int[] cyc=TriangulationCombinatorics.edgeLink(link);
	
	 for(int i=0;i<cyc.length;++i) {
	    int j=(i+1)%cyc.length;
  	    int[] f={link,cyc[i],cyc[j]};
	    int t=TriangulationCombinatorics.lookup(f);
	    if(f!=null) {
   		drawLink(g,T,f,M.C.COL[t]);
		++count;
	    }
	}
    }

    public void drawLink(Graphics2D g,Torus T,int[] f,Color COL) {
	Vector v0=T.U[f[0]];
	Vector v1=T.U[f[1]];
	Vector v2=T.U[f[2]];
	v1=Vector.minus(v1,v0);
	v2=Vector.minus(v2,v0);
	Matrix m=getMatrix();
   	v1=Matrix.act(m,v1);
   	v2=Matrix.act(m,v2);

	
	Path2D.Double p=new Path2D.Double();
	for(int i=0;i<1000;++i) {
	    int j=i+1;
	    double t0=1.0*i/1000;
	    double t1=1.0*j/1000;
	    Vector w0=Vector.plus(v1.scale(1-t0),v2.scale(t0));
	    Vector w1=Vector.plus(v1.scale(1-t1),v2.scale(t1));
	    double[] z0=projectivize(w0);
	    double[] z1=projectivize(w1);
	    double x0=z0[0];
	    double y0=z0[1];
	    double x1=z1[0];
	    double y1=z1[1];
     	    int cc=coherent(w0,w1);
	    if(cc!=0) {
	       p.reset();
	       p.moveTo(x0,y0);
	       p.lineTo(x1,y1);
	       p=transform(p);
	       g.setColor(Color.red);
	       if(cc==-1) g.setColor(Color.blue);
	       g.setColor(COL);
	       g.draw(p);
	    }
	}
    }

    public static int coherent(Vector w0,Vector w1) {
	double x0=w0.x[2];
	double x1=w1.x[2];
	if(x0*x1<0) return 0;
	if(x0>0) return 1;
	return -1;
    }
    
    public static double[] projectivize(Vector w) {
	double x=w.x[0]/w.x[2];
	double y=w.x[1]/w.x[2];
	double[] z={x,y};
	return z;
    }
    /** end link drawing*/


    
    /**drawing the tetration*/

      public void drawTet(Graphics2D g,Torus T) {
	  if(DISPLAY.L[2].on==0) return;
   	int[] k={0,3,15,27,42,54,66,69};
   	for(int i=0;i<8;++i) drawTet(g,T,k[i]);
      }
    

    public void drawTet(Graphics2D g,Torus T,int k) {
	double d=getSlice();
	Matrix m=getMatrix();
	Complex[][] Z=Slicer.tetraSlice(T,m,k,d);
	Path2D.Double p=new Path2D.Double();
	for(int i=0;i<Z.length;++i) {
	    if(Z[i]!=null) {
	       p.moveTo(Z[i][0].x,Z[i][0].y);
	       p.lineTo(Z[i][1].x,Z[i][1].y);
	    }
	}
	p=transform(p);
	g.setColor(DISPLAY.M[2].C);
	g.draw(p);
    }

    /**end tetration*/


    

    /**slice drawing programs*/
    public double getSlice() {
	return slice;
    }


    
    public void drawSlice(Graphics2D g,Torus T) {
	double d=getSlice();
	Matrix mm=getMatrix();
       	Complex[][] Z=Slicer.getSegments(T,mm,d);
	if(Z==null) return;
	if(Z.length==0) return;
	Path2D.Double p=new Path2D.Double();

	for(int i=0;i<Z.length;++i) {
	    if(Z[i]!=null) {
	      p.reset();
	      p.moveTo(Z[i][0].x,Z[i][0].y);
	      p.lineTo(Z[i][1].x,Z[i][1].y);
	      p=transform(p);
  	      g.setColor(M.C.COL[i]);
	      g.draw(p);
	    }
	}
    }

    
    public void drawHandlebody(Graphics2D g,Torus T) {
	double d=getSlice();
	Matrix mm=getMatrix();
	Complex[][] W=new Complex[0][0];
	
	try{
	    W=Slicer.getSegmentsLoop(T,mm,d);
	}
	catch(Exception e) {
	    M.C.MESSAGE="open eye window";
	    M.C.repaint();
	}
	
	Path2D.Double p=new Path2D.Double();
	if(W.length==1) {
	    p=toPath(W,0);
	    p.closePath();
	}

	if(W.length==2) {
	    Path2D.Double p0=toPath(W,0);
	    Path2D.Double p1=toPath(W,1);
            p = new Path2D.Double(Path2D.WIND_EVEN_ODD);
            p.append(p0, false);
            p.append(p1, false);
	}

	p=transform(p);
        g.setColor(DISPLAY.M[0].C);
	if(DISPLAY.L[0].on==1) g.fill(p);
        g.setColor(DISPLAY.M[1].C);
	if(DISPLAY.L[1].on==1) g.draw(p);
    }




	


    public static Path2D.Double toPath(Complex[][] W,int k) {
	Path2D.Double p=new Path2D.Double();
	for(int i=0;i<W[k].length;++i) {
	  if(i==0) p.moveTo(W[k][i].x,W[k][i].y);
	  if(i!=0) p.lineTo(W[k][i].x,W[k][i].y);
	}
	p.closePath();
	return p;
    }

    /**end slice drawing programs*/


    public void drawControls(Graphics2D g) {
	CONTROL.w=this.getWidth();
	CONTROL.render(g,Color.black);
	TORUS.render(g,0,0,80);
	if(TORUS.mode==1) DISPLAY.render(g,85,0,130);
        if(TORUS.mode==0) {
	  LINK.render(g,Color.blue,Color.white,Color.white);
	  g.setFont(new Font("Helvetica",Font.PLAIN,16));
	  g.drawString("# link choice",(int)(LINK.x),(int)(LINK.y-6));
	}
	if(TORUS.mode==1) {
	  g.setColor(Color.white);
	  g.setFont(new Font("Helvetica",Font.PLAIN,16));
	  g.drawString("slicing: qwerty keys",230,20);
	  g.drawString("slice direction: eye window",230,45);
	}
    }

    
    
    
    public void mousePressed(MouseEvent e) {
	MouseData J=MouseData.process(e);
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
	SOURCE=unTransform(J.X);
	M.repaint();
    }

    public void doMouseClick(int mode) {
	if(CONTROL.inside(JX)==1) {
	    doControls(JX);
	    repaint();
	    return;
	}
        if(mode==1)  scaleUp(JX,0);
        if(mode==3)  scaleUp(JX,1);
	if(mode==2)  SOURCE=unTransform(JX);
	M.repaint();
    }



    
    public void mouseDragged(MouseEvent e) { 
	MouseData J=MouseData.process(e);
	if(J.mode==2) {
	    SOURCE=unTransform(J.X);
	}
	M.repaint();
    }
    
     public void mouseReleased(MouseEvent e) {	 
     }

     public void mouseEntered(MouseEvent e) {
	 requestFocusInWindow();
     }
    
     public void mouseExited(MouseEvent e) {}   

     public void mouseMoved(MouseEvent e) {
	MouseData J=MouseData.process(e);
	M.C.MESSAGE="Torus Slicer. Zooming: z,c.   Slicing: q,w,e,r,t,y";
	M.C.repaint();
	JX=new Point(J.X);
     }
    


  public void keyTyped(KeyEvent e) {
      char ch=e.getKeyChar();


      //zooming
      if(ch=='z') doMouseClick(1);
      if(ch=='x') doMouseClick(2);
      if(ch=='c') doMouseClick(3);


      //slicing     
      if(ch=='q') slice=slice-.001;
      if(ch=='w') slice=slice-.01;
      if(ch=='e') slice=slice-.05;
      if(ch=='r') slice=slice+.05;
      if(ch=='t') slice=slice+.01;
      if(ch=='y') slice=slice+.001;



      try{
         double[] bound=M.E.getLevelBounds(T);
        if(slice<bound[0]) slice=bound[0];
        if(slice>bound[1]) slice=bound[1];
      }
      catch(Exception ee) {
	  M.C.MESSAGE="open eye window";
	  M.C.repaint();
      }
      M.repaint();
  }


    
    public void keyPressed(KeyEvent e) {}
    public void keyReleased(KeyEvent e) {
    }

    public void doControls(Point X) {
	TORUS.switchMode(X);
	DISPLAY.process(X,M.C.CS.C);
	LINK.modifyCyclic(X);
	M.repaint();
    }

}
